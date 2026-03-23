import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { CourseGateway } from '../gateways/CourseGateway';
import type { EnrollmentGateway } from '../gateways/EnrollmentGateway';
import { useCourse } from '../hooks/useCourse';
import { VideoPlayer } from '../components/VideoPlayer';

/**
 * CourseLearnPage — Página de ESTUDIO del curso.
 *
 * Diferencia clave con CourseDetailsPage:
 *   - CourseDetailsPage = página de VENTA (info, precio, botón comprar)
 *   - CourseLearnPage   = página de ESTUDIO (video, sidebar, progreso)
 *
 * ¿Por qué recibe DOS gateways?
 *   - courseGateway: para cargar el curso y sus lecciones (datos de lectura)
 *   - enrollmentGateway: para marcar lecciones como completadas (acción de escritura)
 *
 * Esto respeta el Single Responsibility Principle: cada gateway maneja
 * un dominio distinto. No mezclamos "obtener datos del curso" con
 * "gestionar el progreso del alumno" en un solo gateway.
 *
 * La protección de ruta (solo usuarios autenticados) NO vive aquí.
 * Vive en App.tsx con <ProtectedRoute>. ¿Por qué?
 * Porque la autorización es una responsabilidad de la INFRAESTRUCTURA
 * de routing, no de la página. Si la página se protegiera a sí misma,
 * cada página tendría que repetir la misma lógica de auth.
 */

interface CourseLearnPageProps {
    courseGateway: CourseGateway;
    enrollmentGateway: EnrollmentGateway;
}

export const CourseLearnPage = ({ courseGateway, enrollmentGateway }: CourseLearnPageProps) => {
    const { courseId } = useParams<{ courseId: string }>();
    const { course, loading, error } = useCourse(courseGateway, courseId);

    /**
     * currentLessonId — controla qué lección se muestra.
     *
     * Empieza en null (aún no sabemos cuál mostrar). Cuando el curso
     * carga, usamos la primera lección como default.
     *
     * ¿Por qué estado local y no en la URL?
     * Porque cambiar de lección dentro del player es una acción INTERNA
     * de esta página, no una navegación. El usuario no espera que el
     * botón "atrás" del navegador lo lleve a la lección anterior —
     * espera que lo saque del player. Si metiéramos cada lección en la
     * URL, contaminaríamos el historial de navegación.
     */
    const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);

    /**
     * completedLessonIds — lecciones que el alumno marcó como completadas
     * durante ESTA sesión.
     *
     * Limitación actual: no cargamos las completadas previas del backend.
     * Solo rastreamos las que se completan aquí y ahora. En una futura
     * sesión podemos añadir un GET /enrollments/me/progress/:courseId
     * para cargar el historial completo.
     */
    const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
    const [markingComplete, setMarkingComplete] = useState(false);

    /**
     * handleMarkComplete — Marca la lección actual como completada.
     *
     * Patrón "optimistic UI": primero actualizamos el estado local
     * (el usuario ve el cambio al instante), y luego enviamos al backend.
     * Si falla, revertimos. Esto hace que la UI se sienta rápida.
     *
     * useCallback evita que se recree la función en cada render,
     * lo cual es importante porque se pasa como prop a elementos del sidebar.
     */
    const handleMarkComplete = useCallback(async (lessonId: string) => {
        if (!courseId || completedLessonIds.has(lessonId)) return;

        // Optimistic update
        setCompletedLessonIds(prev => new Set(prev).add(lessonId));
        setMarkingComplete(true);

        try {
            await enrollmentGateway.markLessonComplete(lessonId, courseId);
        } catch {
            // Revert on failure
            setCompletedLessonIds(prev => {
                const next = new Set(prev);
                next.delete(lessonId);
                return next;
            });
        } finally {
            setMarkingComplete(false);
        }
    }, [courseId, completedLessonIds, enrollmentGateway]);

    // --- Estados de carga y error ---

    if (loading) {
        return (
            <div className="container course-learn">
                <div className="course-learn__loading">
                    <div className="spinner" />
                    <p>Cargando curso...</p>
                </div>
            </div>
        );
    }

    if (error || !course) {
        return (
            <div className="container course-learn">
                <div className="course-learn__error">
                    <p>{error || 'Curso no encontrado'}</p>
                    <Link to="/mis-cursos" className="btn-secondary">Volver a mis cursos</Link>
                </div>
            </div>
        );
    }

    // Si no hay lecciones, no hay nada que mostrar
    if (course.lessons.length === 0) {
        return (
            <div className="container course-learn">
                <div className="course-learn__empty">
                    <h2>Este curso aún no tiene lecciones</h2>
                    <p>Vuelve pronto, estamos preparando el contenido.</p>
                    <Link to="/mis-cursos" className="btn-secondary">Volver a mis cursos</Link>
                </div>
            </div>
        );
    }

    /**
     * Selección de lección actual:
     * Si currentLessonId es null (primera carga), usamos la primera lección.
     * Si el usuario clickeó una lección en el sidebar, usamos esa.
     */
    const activeLessonId = currentLessonId ?? course.lessons[0].id;
    const activeLesson = course.lessons.find(l => l.id === activeLessonId) ?? course.lessons[0];
    const activeLessonIndex = course.lessons.findIndex(l => l.id === activeLesson.id);
    const isCurrentCompleted = completedLessonIds.has(activeLesson.id);

    // Navegación entre lecciones
    const prevLesson = activeLessonIndex > 0 ? course.lessons[activeLessonIndex - 1] : null;
    const nextLesson = activeLessonIndex < course.lessons.length - 1 ? course.lessons[activeLessonIndex + 1] : null;

    return (
        <div className="course-learn">
            {/* ── Área principal: Video + info ── */}
            <div className="course-learn__main">
                {/* Header con navegación */}
                <div className="course-learn__header">
                    <Link to="/mis-cursos" className="course-learn__back">
                        ← Mis cursos
                    </Link>
                    <h2 className="course-learn__course-title">{course.title}</h2>
                </div>

                {/* Video player */}
                <div className="course-learn__video">
                    <VideoPlayer
                        src={activeLesson.videoUrl ?? ''}
                        title={activeLesson.title}
                        lessonId={activeLesson.id}
                    />
                </div>

                {/* Info de la lección actual */}
                <div className="course-learn__lesson-info">
                    <div className="course-learn__lesson-header">
                        <h1 className="course-learn__lesson-title">{activeLesson.title}</h1>
                        <button
                            className={`course-learn__complete-btn ${isCurrentCompleted ? 'course-learn__complete-btn--done' : ''}`}
                            onClick={() => handleMarkComplete(activeLesson.id)}
                            disabled={isCurrentCompleted || markingComplete}
                        >
                            {isCurrentCompleted ? 'Completada' : 'Marcar como completada'}
                        </button>
                    </div>
                    {activeLesson.description && (
                        <p className="course-learn__lesson-desc">{activeLesson.description}</p>
                    )}

                    {/* Navegación anterior / siguiente */}
                    <div className="course-learn__nav">
                        {prevLesson ? (
                            <button
                                className="course-learn__nav-btn"
                                onClick={() => setCurrentLessonId(prevLesson.id)}
                            >
                                ← {prevLesson.title}
                            </button>
                        ) : <span />}
                        {nextLesson ? (
                            <button
                                className="course-learn__nav-btn course-learn__nav-btn--next"
                                onClick={() => setCurrentLessonId(nextLesson.id)}
                            >
                                {nextLesson.title} →
                            </button>
                        ) : <span />}
                    </div>
                </div>
            </div>

            {/* ── Sidebar: Lista de lecciones ── */}
            <aside className="course-learn__sidebar">
                <div className="course-learn__sidebar-header">
                    <h3>Temario</h3>
                    <span className="course-learn__sidebar-count">
                        {completedLessonIds.size} / {course.lessons.length}
                    </span>
                </div>

                <div className="course-learn__lesson-list">
                    {course.lessons.map((lesson, index) => {
                        const isActive = lesson.id === activeLesson.id;
                        const isCompleted = completedLessonIds.has(lesson.id);

                        return (
                            <button
                                key={lesson.id}
                                className={`course-learn__lesson-item ${isActive ? 'course-learn__lesson-item--active' : ''} ${isCompleted ? 'course-learn__lesson-item--completed' : ''}`}
                                onClick={() => setCurrentLessonId(lesson.id)}
                            >
                                <span className="course-learn__lesson-number">
                                    {isCompleted ? '✓' : index + 1}
                                </span>
                                <span className="course-learn__lesson-name">
                                    {lesson.title}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </aside>
        </div>
    );
};
