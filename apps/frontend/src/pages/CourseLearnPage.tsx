import { useState, useCallback, useRef, useEffect } from 'react';

// Porcentaje mínimo del video que el alumno debe ver para poder
// marcar la lección como completada.
const WATCH_THRESHOLD = 80;
import { useParams, Link } from 'react-router-dom';
import { LessonType } from '@maris-nails/shared';
import type { CourseGateway } from '../gateways/CourseGateway';
import type { EnrollmentGateway } from '../gateways/EnrollmentGateway';
import { useCourse } from '../hooks/useCourse';
import { useEnrollments } from '../hooks/useEnrollments';
import { VideoPlayer } from '../components/VideoPlayer';
import { QuizPlayer } from '../components/QuizPlayer';

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
 * SEGURIDAD — Dos niveles de protección:
 *   1. <ProtectedRoute> en App.tsx → solo usuarios AUTENTICADOS llegan aquí
 *   2. Verificación de enrollment aquí → solo usuarios MATRICULADOS ven el contenido
 *
 * ¿Por qué la verificación de enrollment vive AQUÍ y no en el router?
 * Porque ProtectedRoute es genérico (solo sabe de auth y roles).
 * La lógica de "¿compró este curso?" es ESPECÍFICA de este dominio.
 * Si la metiéramos en el router, tendríamos que pasarle el enrollmentGateway
 * al router, acoplándolo a un dominio que no le corresponde.
 *
 * Es la misma razón por la que un guardia de seguridad en un edificio
 * revisa tu badge (autenticación), pero la recepción de cada piso
 * verifica que tengas cita (autorización específica del dominio).
 */

interface CourseLearnPageProps {
    courseGateway: CourseGateway;
    enrollmentGateway: EnrollmentGateway;
}

export const CourseLearnPage = ({ courseGateway, enrollmentGateway }: CourseLearnPageProps) => {
    const { courseId } = useParams<{ courseId: string }>();
    const { course, loading: courseLoading, error: courseError } = useCourse(courseGateway, courseId);

    /**
     * useEnrollments nos da la lista de cursos que el usuario ha comprado.
     * Lo usamos para verificar que este courseId está en esa lista.
     *
     * ¿Por qué no creamos un endpoint específico como GET /enrollments/me/:courseId?
     * Porque ya tenemos la lista completa en useEnrollments, y un usuario
     * típico tiene pocos cursos (1-5). No vale la pena un endpoint extra
     * para evitar filtrar un array de 5 elementos en el cliente.
     */
    const { enrollments, loading: enrollmentLoading, error: enrollmentError } = useEnrollments(enrollmentGateway);

    const loading = courseLoading || enrollmentLoading;
    const error = courseError || enrollmentError;

    /**
     * isEnrolled — ¿El usuario compró este curso?
     *
     * Si no ha terminado de cargar, asumimos false (se mostrará el spinner).
     * Una vez cargado, buscamos si el courseId actual está en su lista de matrículas.
     */
    const isEnrolled = enrollments.some(e => e.course.id === courseId);

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

    // watchProgress: porcentaje del video actual que el alumno ha visto (0-100).
    const [watchProgress, setWatchProgress] = useState(0);
    const lastReportedProgressRef = useRef(0);
    // lastSavedThresholdRef: último umbral del 5% que ya enviamos al backend.
    // Evita enviar la misma llamada dos veces para el mismo umbral.
    const lastSavedThresholdRef = useRef(0);

    // completedLessonIds y watchProgress se cargan desde el backend al montar la página,
    // así el alumno nunca pierde su progreso entre sesiones o dispositivos.
    const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
    const [savedWatchProgress, setSavedWatchProgress] = useState<Record<string, number>>({});
    const [markingComplete, setMarkingComplete] = useState(false);

    useEffect(() => {
        if (!courseId || !isEnrolled) return;
        enrollmentGateway.getCourseProgress(courseId).then(({ completedLessonIds: ids, watchProgress }) => {
            setCompletedLessonIds(new Set(ids));
            setSavedWatchProgress(watchProgress);
        }).catch(() => { /* Si falla, empezamos en cero — no es bloqueante */ });
    }, [courseId, isEnrolled, enrollmentGateway]);

    const handleWatchProgress = useCallback((percent: number) => {
        // Re-render solo si el progreso subió al menos 1 punto
        if (percent - lastReportedProgressRef.current >= 1 || percent === 100) {
            lastReportedProgressRef.current = percent;
            setWatchProgress(percent);
        }
    }, []);

    // activeLessonIdForEffect captura el currentLessonId actual para usarlo en los effects
    const activeLessonIdForEffect = currentLessonId;

    // Cuando llegan los datos del backend, sincronizamos el progreso de la lección activa.
    useEffect(() => {
        if (!activeLessonIdForEffect) return;
        const saved = savedWatchProgress[activeLessonIdForEffect] ?? 0;
        if (saved > 0) {
            setWatchProgress(saved);
            lastReportedProgressRef.current = saved;
            lastSavedThresholdRef.current = Math.floor(saved / 5) * 5;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [savedWatchProgress]);

    // Guardamos en el backend cada vez que el alumno cruza un umbral del 5%
    useEffect(() => {
        if (!courseId || !activeLessonIdForEffect) return;
        const threshold = Math.floor(watchProgress / 5) * 5;
        if (threshold > lastSavedThresholdRef.current && threshold > 0) {
            lastSavedThresholdRef.current = threshold;
            enrollmentGateway.saveWatchProgress(activeLessonIdForEffect, courseId, threshold);
        }
    }, [watchProgress, courseId, activeLessonIdForEffect, enrollmentGateway]);

    // Al cambiar de lección, inicializamos el progreso con el valor guardado en BD
    const handleLessonChange = useCallback((lessonId: string) => {
        setCurrentLessonId(lessonId);
        const saved = savedWatchProgress[lessonId] ?? 0;
        setWatchProgress(saved);
        lastReportedProgressRef.current = saved;
        lastSavedThresholdRef.current = Math.floor(saved / 5) * 5;
    }, [savedWatchProgress]);

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

    // GUARD: si el usuario no está matriculado, no puede ver las lecciones.
    // Lo redirigimos a la página de detalle del curso (donde puede comprarlo).
    if (!isEnrolled) {
        return (
            <div className="container course-learn">
                <div className="course-learn__error">
                    <h2>No tienes acceso a este curso</h2>
                    <p>Necesitas comprar el curso para acceder a sus lecciones.</p>
                    <Link to={`/courses/${courseId}`} className="btn-primary">Ver curso</Link>
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
    const activeLessonId = currentLessonId ?? course.lessons[0]?.id ?? '';
    const activeLesson = course.lessons.find(l => l.id === activeLessonId) ?? course.lessons[0];
    const activeLessonIndex = course.lessons.findIndex(l => l.id === activeLesson.id);
    const isCurrentCompleted = completedLessonIds.has(activeLesson.id);

    // Determinar si la lección activa es un examen
    const isExamLesson = activeLesson.type === LessonType.EXAM;

    // Los videos de YouTube no permiten tracking desde fuera del iframe,
    // así que los exoneramos del requisito de progreso.
    const isYoutubeLesson = activeLesson.videoData?.videoUrl?.includes('youtube.com') || activeLesson.videoData?.videoUrl?.includes('youtu.be');
    const hasWatchedEnough = isExamLesson || isYoutubeLesson || watchProgress >= WATCH_THRESHOLD;

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

                {/* Contenido principal: Video o Quiz según tipo de lección */}
                {isExamLesson ? (
                    <div className="course-learn__quiz">
                        <QuizPlayer
                            courseId={courseId!}
                            lessonId={activeLesson.id}
                            courseGateway={courseGateway}
                            enrollmentGateway={enrollmentGateway}
                            onComplete={() => handleMarkComplete(activeLesson.id)}
                            onNavigateToLesson={(targetLessonId) => handleLessonChange(targetLessonId)}
                        />
                    </div>
                ) : (
                    <>
                        <div className="course-learn__video">
                            <VideoPlayer
                                src={activeLesson.videoData?.videoUrl ?? ''}
                                title={activeLesson.title}
                                lessonId={activeLesson.id}
                                onWatchProgress={handleWatchProgress}
                            />
                        </div>

                        {/* Barra de progreso de visualización — solo para videos locales */}
                        {!isYoutubeLesson && !isCurrentCompleted && (
                            <div className="course-learn__watch-progress">
                                <div className="course-learn__watch-progress-bar">
                                    <div
                                        className="course-learn__watch-progress-fill"
                                        style={{ width: `${watchProgress}%` }}
                                    />
                                </div>
                                <span className="course-learn__watch-progress-label">
                                    {hasWatchedEnough
                                        ? 'Listo para completar'
                                        : `Visto ${Math.floor(watchProgress)}% · Necesitas ver al menos el ${WATCH_THRESHOLD}%`}
                                </span>
                            </div>
                        )}
                    </>
                )}

                {/* Info de la lección actual */}
                <div className="course-learn__lesson-info">
                    <div className="course-learn__lesson-header">
                        <h1 className="course-learn__lesson-title">{activeLesson.title}</h1>
                        {/* Para exámenes, la lección se completa automáticamente al aprobar.
                            Solo mostramos el botón manual para lecciones tipo class. */}
                        {!isExamLesson && (
                            <button
                                className={`course-learn__complete-btn ${isCurrentCompleted ? 'course-learn__complete-btn--done' : ''}`}
                                onClick={() => handleMarkComplete(activeLesson.id)}
                                disabled={isCurrentCompleted || markingComplete || !hasWatchedEnough}
                                title={!hasWatchedEnough ? `Necesitas ver al menos el ${WATCH_THRESHOLD}% del video` : undefined}
                            >
                                {isCurrentCompleted ? 'Completada' : 'Marcar como completada'}
                            </button>
                        )}
                        {isExamLesson && isCurrentCompleted && (
                            <span className="course-learn__complete-btn course-learn__complete-btn--done">
                                Aprobado
                            </span>
                        )}
                    </div>
                    {activeLesson.description && (
                        <p className="course-learn__lesson-desc">{activeLesson.description}</p>
                    )}

                    {/* Navegación anterior / siguiente */}
                    <div className="course-learn__nav">
                        {prevLesson ? (
                            <button
                                className="course-learn__nav-btn"
                                onClick={() => handleLessonChange(prevLesson.id)}
                            >
                                ← {prevLesson.title}
                            </button>
                        ) : <span />}
                        {nextLesson ? (
                            <button
                                className="course-learn__nav-btn course-learn__nav-btn--next"
                                onClick={() => handleLessonChange(nextLesson.id)}
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
                                onClick={() => handleLessonChange(lesson.id)}
                            >
                                <span className="course-learn__lesson-number">
                                    {isCompleted
                                        ? '✓'
                                        : lesson.type === LessonType.EXAM
                                            ? '📝'
                                            : index + 1}
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
