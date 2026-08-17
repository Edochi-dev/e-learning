import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { EnrollmentGateway, CourseStudent } from '../../gateways/EnrollmentGateway';
import type { CourseGateway } from '../../gateways/CourseGateway';
import { useToast } from '../../components/Toast';

interface CourseStudentsPageProps {
    gateway: EnrollmentGateway;
    courseGateway: CourseGateway;
}

/** Atajos de renovación. El valor es la cantidad de días desde hoy. */
const EXTENSION_PRESETS = [30, 60, 90, 365];

/**
 * Nueva fecha de vencimiento al añadir `days` días.
 *
 * Si la alumna TODAVÍA tiene acceso, los días se suman a lo que le queda; si ya
 * venció, cuentan desde hoy. Contar siempre desde hoy le quitaría los días que
 * aún no ha usado, que es justo lo contrario de renovar.
 */
const extendedExpiry = (student: CourseStudent, days: number): string => {
    const base =
        student.isActive && student.expiresAt
            ? new Date(student.expiresAt)
            : new Date();

    base.setDate(base.getDate() + days);
    return base.toISOString();
};

const formatDate = (iso: string | null): string => {
    if (!iso) return 'Permanente';
    return new Date(iso).toLocaleDateString('es', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

const accessSummary = (student: CourseStudent): string => {
    if (!student.expiresAt) return 'Acceso permanente';
    if (!student.isActive) return `Venció el ${formatDate(student.expiresAt)}`;
    if (student.daysRemaining === 1) return 'Queda 1 día';
    return `Quedan ${student.daysRemaining} días`;
};

/**
 * CourseStudentsPage — Alumnas de un curso y control de su acceso.
 *
 * Todo el estado del acceso (activo, días restantes) llega ya resuelto del
 * backend: esta página no recalcula vencimientos.
 */
export const CourseStudentsPage = ({ gateway, courseGateway }: CourseStudentsPageProps) => {
    const { courseId } = useParams<{ courseId: string }>();
    const toast = useToast();

    const [students, setStudents] = useState<CourseStudent[]>([]);
    const [courseTitle, setCourseTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [savingId, setSavingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!courseId) return;

        setLoading(true);
        setError(null);
        try {
            const [course, list] = await Promise.all([
                courseGateway.findOne(courseId),
                gateway.listCourseStudents(courseId),
            ]);
            setCourseTitle(course.title);
            setStudents(list);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar las alumnas');
        } finally {
            setLoading(false);
        }
    }, [courseId, courseGateway, gateway]);

    useEffect(() => {
        void load();
    }, [load]);

    const updateExpiry = async (student: CourseStudent, expiresAt: string | null) => {
        setSavingId(student.enrollmentId);
        try {
            await gateway.setEnrollmentExpiry(student.enrollmentId, expiresAt);
            // Releemos en vez de parchear el estado local: los días restantes
            // los calcula el servidor, y esta lista debe mostrar los suyos.
            await load();
            toast.success(`Acceso actualizado para ${student.student.fullName}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'No se pudo actualizar');
        } finally {
            setSavingId(null);
        }
    };

    if (loading) {
        return (
            <div className="admin-page">
                <div className="spinner" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-page">
                <Link to="/admin/cursos" className="back-link">← Volver a Cursos</Link>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <Link to="/admin/cursos" className="back-link">← Volver a Cursos</Link>

            <div className="admin-page__header">
                <h1>Alumnas de {courseTitle}</h1>
                <p className="admin-page__subtitle">
                    {students.length === 0
                        ? 'Todavía no hay alumnas matriculadas en este curso'
                        : `${students.length} matriculada${students.length === 1 ? '' : 's'}`}
                </p>
            </div>

            {students.length > 0 && (
                <div className="students-table">
                    {students.map((student) => (
                        <article
                            key={student.enrollmentId}
                            className={`student-row${student.isActive ? '' : ' student-row--expired'}`}
                        >
                            <div className="student-row__identity">
                                <strong>{student.student.fullName}</strong>
                                <span className="student-row__email">{student.student.email}</span>
                            </div>

                            <div className="student-row__access">
                                <span
                                    className={`student-row__badge student-row__badge--${student.isActive ? 'active' : 'expired'}`}
                                >
                                    {accessSummary(student)}
                                </span>
                                <span className="student-row__dates">
                                    Matriculada el {formatDate(student.enrolledAt)}
                                </span>
                            </div>

                            <div className="student-row__actions">
                                {EXTENSION_PRESETS.map((days) => (
                                    <button
                                        key={days}
                                        type="button"
                                        className="btn-secondary btn-sm"
                                        // Sumar días a un acceso permanente lo convertiría
                                        // en temporal, que es recortarlo, no extenderlo.
                                        disabled={
                                            savingId === student.enrollmentId ||
                                            student.expiresAt === null
                                        }
                                        title={
                                            student.expiresAt === null
                                                ? 'Ya tiene acceso permanente'
                                                : `Nuevo vencimiento: ${formatDate(extendedExpiry(student, days))}`
                                        }
                                        onClick={() =>
                                            void updateExpiry(student, extendedExpiry(student, days))
                                        }
                                    >
                                        +{days}d
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    className="btn-secondary btn-sm"
                                    disabled={
                                        savingId === student.enrollmentId ||
                                        student.expiresAt === null
                                    }
                                    onClick={() => void updateExpiry(student, null)}
                                    title="Acceso sin fecha de vencimiento"
                                >
                                    Permanente
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
};
