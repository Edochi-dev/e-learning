import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import type { CourseGateway } from '../../gateways/CourseGateway';
import type { Course } from '@maris-nails/shared';

interface Props {
    gateway: CourseGateway;
}

/**
 * CoursesAdminPage — Sub-panel de gestión de cursos.
 *
 * Sigue el patrón canónico de admin-hub establecido por CertificatesAdminPage:
 *   1. Cards arriba con las acciones del módulo (puertas a flujos).
 *   2. Listado abajo de los items existentes con sus acciones inline.
 *
 * Antes este contenido vivía dentro de AdminDashboardPage como una card
 * inflada con la lista inline. Eso rompía la coherencia mental del panel
 * principal: el panel debe ser puerta, no editor. Ahora cada dominio
 * (cursos, certificados, etc.) tiene su propio sub-panel y el dashboard
 * principal queda como un router de intenciones puro.
 */
export const CoursesAdminPage: React.FC<Props> = ({ gateway: courseGateway }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // ID del curso que está en modo "¿Confirmar eliminación?"
    // null = ningún curso está en ese estado.
    const [confirmingId, setConfirmingId] = useState<string | null>(null);

    // ID del curso que está siendo eliminado ahora mismo (para mostrar spinner).
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Guardamos el ID del temporizador de confirmación para poder cancelarlo.
    // useRef (no useState) porque cambiar el timer no debe disparar re-renders.
    const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const loadCourses = async () => {
            try {
                const data = await courseGateway.findAll();
                setCourses(data);
            } catch (err) {
                console.error('Error loading courses', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadCourses();
    }, [courseGateway]);

    /**
     * Lógica de confirmación en dos pasos (mantenida del AdminDashboardPage anterior):
     *
     * Primer clic → el botón entra en modo "¿Eliminar?" y se activa un timer
     *               de 3 segundos. Si el usuario no confirma, vuelve al estado normal.
     *
     * Segundo clic (en modo confirmar) → ejecuta el borrado real.
     *
     * Si el usuario hace clic en OTRO curso mientras uno está en modo confirmar,
     * cancelamos el timer anterior y ponemos el nuevo en modo confirmar.
     */
    const handleDeleteClick = async (courseId: string) => {
        if (confirmingId === courseId) {
            // Segundo clic → confirmar y ejecutar
            if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
            setConfirmingId(null);
            await executeDeletion(courseId);
        } else {
            // Primer clic → entrar en modo confirmar
            if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
            setConfirmingId(courseId);

            // Auto-cancelar después de 3 segundos si el usuario no confirma
            confirmTimerRef.current = setTimeout(() => {
                setConfirmingId(null);
            }, 3000);
        }
    };

    const executeDeletion = async (courseId: string) => {
        setDeletingId(courseId);
        try {
            await courseGateway.delete(courseId);
            // Actualizar la lista local sin hacer otro fetch al servidor
            setCourses(prev => prev.filter(c => c.id !== courseId));
        } catch (err) {
            console.error('Error al eliminar curso', err);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="admin-page">
            <Link to="/admin" className="back-link">← Volver al Panel</Link>
            <div className="admin-header">
                <h1>Gestión de Cursos</h1>
                <p>Crea nuevos cursos o administra los existentes desde aquí.</p>
            </div>

            <div className="admin-grid">
                {/* Card-puerta: Crear Curso */}
                <div className="admin-card">
                    <div className="admin-card-icon">✨</div>
                    <h3>Nuevo Curso</h3>
                    <p>Agrega un nuevo curso a la plataforma con título, descripción, precio y lecciones.</p>
                    <Link to="/admin/courses/new" className="btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
                        Crear Nuevo Curso
                    </Link>
                </div>
            </div>

            {/* Listado de cursos existentes */}
            <div style={{ marginTop: '2rem' }}>
                <h2 style={{ marginBottom: '1rem' }}>Cursos existentes</h2>
                {isLoading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Cargando cursos...</p>
                ) : courses.length === 0 ? (
                    <div className="admin-empty">No hay cursos aún.</div>
                ) : (
                    <div className="admin-course-links">
                        {courses.map(course => (
                            /*
                             * Cada fila tiene dos acciones: Editar (link prominente) y Eliminar
                             * (botón discreto con confirmación de doble clic).
                             * Mismo patrón que tenía AdminDashboardPage antes del refactor —
                             * lo preservamos tal cual para no introducir cambios de UX en este commit.
                             */
                            <div key={course.id} className="admin-course-row">
                                <Link
                                    to={`/admin/courses/${course.id}/edit`}
                                    className="admin-course-link"
                                >
                                    <span className="admin-course-link-title">{course.title}</span>
                                    <span className="admin-course-link-meta">
                                        {course.lessons?.length || 0} lecciones
                                    </span>
                                </Link>

                                <button
                                    className={`admin-course-delete ${confirmingId === course.id ? 'admin-course-delete--confirm' : ''}`}
                                    onClick={() => handleDeleteClick(course.id)}
                                    disabled={deletingId === course.id}
                                    aria-label={confirmingId === course.id ? 'Confirmar eliminación' : `Eliminar ${course.title}`}
                                >
                                    {deletingId === course.id
                                        ? '...'
                                        : confirmingId === course.id
                                            ? '¿Eliminar?'
                                            : <Trash2 size={15} strokeWidth={2} color="#1a1a1a" />}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
