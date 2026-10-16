import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { LessonType, VideoProvider } from '@maris-nails/shared';
import type { CourseGateway } from '../gateways/CourseGateway';
import type { EnrollmentGateway } from '../gateways/EnrollmentGateway';
import type { VideoGateway } from '../gateways/VideoGateway';
import type { CorrectionGateway } from '../gateways/CorrectionGateway';
import { useCourse } from '../hooks/useCourse';
import { useEnrollments } from '../hooks/useEnrollments';
import { VideoPlayer } from '../components/VideoPlayer';
import { LiveLessonGate } from '../components/LiveLessonGate';
import { QuizPlayer } from '../components/QuizPlayer';
import { SubmissionPlayer } from '../components/SubmissionPlayer';
import { useToast } from '../components/Toast';
import { enrollWhatsappUrl, renewWhatsappUrl } from '../lib/whatsapp';
import { WatchProgress } from '../components/WatchProgress';
import { liveClassPhase } from '../lib/live-class';

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
    videoGateway: VideoGateway;
    correctionGateway: CorrectionGateway;
}

export const CourseLearnPage = ({ courseGateway, enrollmentGateway, videoGateway, correctionGateway }: CourseLearnPageProps) => {
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
     * Dos preguntas distintas, y el usuario ve un mensaje distinto en cada caso:
     * nunca compró el curso (comprar) o su acceso venció (renovar).
     *
     * Esto es UX, NO seguridad: el control real lo hace EnrollmentGuard en el
     * backend, que rechaza igual aunque alguien manipule esta comprobación.
     */
    const enrollment = enrollments.find(e => e.course.id === courseId);
    const isEnrolled = Boolean(enrollment);
    const hasActiveAccess = enrollment?.isActive ?? false;

    /**
     * currentLessonId — qué lección se muestra; null = la primera.
     *
     * Se toma de ?leccion= (la portada enlaza a una lección concreta) y se
     * mantiene ahí con `replace`: recargar conserva la lección, pero cambiar
     * de lección no agrega historial — "atrás" saca del player, como espera
     * la alumna, en vez de recorrer lección por lección.
     */
    const [searchParams, setSearchParams] = useSearchParams();
    const [currentLessonId, setCurrentLessonId] = useState<string | null>(() => searchParams.get('leccion'));

    /**
     * isSidebarOpen: controla el temario colapsable.
     *
     * Reglas:
     * - Bajo 1100px (drawer), SIEMPRE arranca cerrado. Un drawer
     *   abierto en mobile tapa la pantalla entera y bloquea el video —
     *   ningún caso de uso justifica arrancar así.
     * - En desktop, respetamos la preferencia guardada en localStorage
     *   (la alumna puede preferir "modo inmersión" sin temario).
     * - La persistencia SOLO ocurre en desktop. Así un open temporal en
     *   mobile no contamina la preferencia desktop ni al revés.
     */
    const SIDEBAR_STORAGE_KEY = 'course-learn.sidebar-open';
    // Debe coincidir con el corte del drawer en App.css (.course-learn).
    const MOBILE_MEDIA_QUERY = '(max-width: 1099px)';
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
        if (typeof window === 'undefined') return true;
        if (window.matchMedia(MOBILE_MEDIA_QUERY).matches) return false;
        const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
        if (stored !== null) return stored === 'true';
        return true;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        // Solo persistimos la preferencia en desktop. En mobile, abrir/cerrar
        // es una acción de sesión, no una preferencia del usuario.
        if (window.matchMedia(MOBILE_MEDIA_QUERY).matches) return;
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isSidebarOpen));
    }, [isSidebarOpen]);

    // watchProgress: porcentaje acumulado de la lección activa (todas las
    // sesiones), tal como lo calcula el servidor a partir de los segmentos.
    const [watchProgress, setWatchProgress] = useState(0);

    // completedLessonIds y watchProgress se cargan desde el backend al montar la página,
    // así el alumno nunca pierde su progreso entre sesiones o dispositivos.
    const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
    const [savedWatchProgress, setSavedWatchProgress] = useState<Record<string, number>>({});
    const [markingComplete, setMarkingComplete] = useState(false);
    const toast = useToast();

    useEffect(() => {
        if (!courseId || !isEnrolled) return;
        enrollmentGateway.getCourseProgress(courseId).then(({ completedLessonIds: ids, watchProgress }) => {
            setCompletedLessonIds(new Set(ids));
            setSavedWatchProgress(watchProgress);
        }).catch(() => { /* Si falla, empezamos en cero — no es bloqueante */ });
    }, [courseId, isEnrolled, enrollmentGateway]);

    // Sin lección elegida (o con una ajena al curso en la URL) se muestra la
    // primera: su progreso también se guarda.
    const activeLessonIdForEffect =
        course?.lessons.find((l) => l.id === currentLessonId)?.id ?? course?.lessons[0]?.id ?? null;
    const activeLessonRef = useRef<string | null>(null);
    const completedRef = useRef(completedLessonIds);
    useEffect(() => { activeLessonRef.current = activeLessonIdForEffect; }, [activeLessonIdForEffect]);
    useEffect(() => { completedRef.current = completedLessonIds; }, [completedLessonIds]);

    // Cuando llegan los datos del backend, sincronizamos el progreso de la lección activa.
    useEffect(() => {
        if (!activeLessonIdForEffect) return;
        setWatchProgress(savedWatchProgress[activeLessonIdForEffect] ?? 0);
    }, [savedWatchProgress, activeLessonIdForEffect]);

    // Segmentos de la sesión pendientes de enviar, y cuántos se enviaron ya.
    const pendingRef = useRef<{ lessonId: string; segments: number[] } | null>(null);
    const sentCountRef = useRef(0);

    const sendSegments = useCallback((lessonId: string, segments: number[]) => {
        if (!courseId || segments.length === 0) return;
        sentCountRef.current = segments.length;
        enrollmentGateway.saveWatchedSegments(lessonId, courseId, segments)
            .then(({ watchedPercent, lessonCompleted }) => {
                setSavedWatchProgress(prev => ({
                    ...prev,
                    [lessonId]: Math.max(prev[lessonId] ?? 0, watchedPercent),
                }));
                if (lessonCompleted && !completedRef.current.has(lessonId)) {
                    setCompletedLessonIds(prev => new Set(prev).add(lessonId));
                    toast.success('¡Lección completada!');
                }
            })
            // Sin red no se pierde nada: el próximo envío lleva todos los segmentos de la sesión.
            .catch(() => { sentCountRef.current = 0; });
    }, [courseId, enrollmentGateway, toast]);

    // Se envía cada 2% nuevo, y siempre al pausar o terminar el video.
    const handleWatchedSegments = useCallback((segments: number[], flush: boolean) => {
        const lessonId = activeLessonRef.current;
        if (!lessonId) return;
        pendingRef.current = { lessonId, segments };
        setWatchProgress(p => Math.max(p, segments.length));
        const unsent = segments.length - sentCountRef.current;
        if (unsent >= 2 || (flush && unsent > 0)) sendSegments(lessonId, segments);
    }, [sendSegments]);

    const flushPending = useCallback(() => {
        const pending = pendingRef.current;
        if (pending && pending.segments.length > sentCountRef.current) {
            sendSegments(pending.lessonId, pending.segments);
        }
    }, [sendSegments]);

    // Al ocultar la pestaña (bloquear el teléfono, cambiar de app) o salir de
    // la página, lo visto desde el último envío se guarda igual.
    useEffect(() => {
        const onVisibility = () => { if (document.visibilityState === 'hidden') flushPending(); };
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            flushPending();
        };
    }, [flushPending]);

    // Al cambiar de lección, inicializamos el progreso con el valor guardado en BD.
    // En mobile, cerramos el drawer automáticamente — si la alumna tocó una
    // lección del temario, su intención es VER esa lección; mantener el
    // drawer abierto taparía el video que acaba de pedir.
    const handleLessonChange = useCallback((lessonId: string) => {
        flushPending();
        pendingRef.current = null;
        sentCountRef.current = 0;
        setCurrentLessonId(lessonId);
        setSearchParams({ leccion: lessonId }, { replace: true });
        setWatchProgress(savedWatchProgress[lessonId] ?? 0);
        if (typeof window !== 'undefined' && window.matchMedia(MOBILE_MEDIA_QUERY).matches) {
            setIsSidebarOpen(false);
        }
    }, [savedWatchProgress, flushPending, setSearchParams]);

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

    if (!isEnrolled) {
        return (
            <div className="container course-learn">
                <div className="course-learn__error">
                    <h2>No tienes acceso a este curso</h2>
                    <p>Para ver sus lecciones, coordina tu inscripción con la profesora.</p>
                    <a href={enrollWhatsappUrl(course.title)} className="btn-primary" target="_blank" rel="noopener noreferrer">
                        Quiero inscribirme
                    </a>
                </div>
            </div>
        );
    }

    if (!hasActiveAccess) {
        return (
            <div className="container course-learn">
                <div className="course-learn__error">
                    <h2>Tu acceso a este curso venció</h2>
                    <p>
                        Tu progreso y tus certificados se conservan. Al renovar, retomas
                        el curso justo donde lo dejaste.
                    </p>
                    <a href={renewWhatsappUrl(course.title)} className="btn-primary" target="_blank" rel="noopener noreferrer">
                        Renovar acceso por WhatsApp
                    </a>
                    <Link to="/mis-cursos" className="btn-secondary">
                        Volver a mis cursos
                    </Link>
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

    // Determinar el tipo de la lección activa
    const isExamLesson = activeLesson.type === LessonType.EXAM;
    const isCorrectionLesson = activeLesson.type === LessonType.CORRECTION;

    // Los videos de YouTube no permiten tracking desde fuera del iframe,
    // así que los exoneramos del requisito de progreso.
    const isYoutubeLesson = activeLesson.videoData?.provider === VideoProvider.YOUTUBE;
    // A live stream has no fixed length to measure progress against.
    const isLiveLesson = !!activeLesson.videoData?.isLive;
    const isTrackedVideo = !isExamLesson && !isCorrectionLesson && !isYoutubeLesson && !isLiveLesson;
    // Una clase en vivo no se puede dar por vista antes de que empiece.
    const live = activeLesson.videoData;
    const liveNotStarted = isLiveLesson && !!live?.liveStartsAt && !!live.liveEndsAt
        && liveClassPhase(new Date(live.liveStartsAt), new Date(live.liveEndsAt), new Date()) === 'upcoming';

    // Navegación entre lecciones
    const prevLesson = activeLessonIndex > 0 ? course.lessons[activeLessonIndex - 1] : null;
    const nextLesson = activeLessonIndex < course.lessons.length - 1 ? course.lessons[activeLessonIndex + 1] : null;

    return (
        <div className={`course-learn ${isSidebarOpen ? '' : 'course-learn--sidebar-closed'}`}>
            {/* Lengüeta del temario, solo en escritorio y con el temario cerrado.
                Bajo 1100px el temario se abre desde la barra de contexto. */}
            <button
                type="button"
                className="course-learn__sidebar-opener"
                onClick={() => setIsSidebarOpen(prev => !prev)}
                aria-expanded={isSidebarOpen}
                aria-controls="course-learn-sidebar"
            >
                <span className="course-learn__sidebar-opener-chevron" aria-hidden="true">
                    ‹
                </span>
                <span className="course-learn__sidebar-opener-label">
                    Temario
                </span>
            </button>

            {/* ── Área principal: Video + info ── */}
            <div className="course-learn__main">
                <div className="course-learn__context">
                    <Link to={`/mis-cursos/${course.id}`} className="course-learn__back">
                        <span aria-hidden="true">←</span>
                        <span className="course-learn__course-title">{course.title}</span>
                    </Link>
                    <span className="course-learn__context-progress">
                        {completedLessonIds.size} / {course.lessons.length}
                    </span>
                    <button
                        type="button"
                        className="course-learn__context-toggle"
                        onClick={() => setIsSidebarOpen(true)}
                        aria-expanded={isSidebarOpen}
                        aria-controls="course-learn-sidebar"
                    >
                        ☰ Temario
                        <span className="course-learn__context-toggle-count">
                            {completedLessonIds.size}/{course.lessons.length}
                        </span>
                    </button>
                </div>

                {/* Contenido principal: Video, Quiz o Corrección según tipo */}
                {isCorrectionLesson ? (
                    <div className="course-learn__quiz">
                        <SubmissionPlayer
                            lessonId={activeLesson.id}
                            courseId={courseId!}
                            referenceImageUrl={activeLesson.assignmentData?.referenceImageUrl}
                            instructions={activeLesson.assignmentData?.instructions}
                            gateway={correctionGateway}
                        />
                    </div>
                ) : isExamLesson ? (
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
                    <div className="course-learn__video">
                        <LiveLessonGate
                            lesson={activeLesson}
                        >
                            <VideoPlayer
                                title={activeLesson.title}
                                lessonId={activeLesson.id}
                                provider={activeLesson.videoData?.provider ?? VideoProvider.HOSTED}
                                videoGateway={videoGateway}
                                onWatchedSegments={handleWatchedSegments}
                            />
                        </LiveLessonGate>
                    </div>
                )}

                {/* Barra de controles de lección — prev | completar | next.
                    Los tres son acciones de "¿qué hago con esta lección ahora?",
                    por eso van agrupados arriba del título. Así:
                    - Siempre visibles sin importar qué tan larga sea la descripción.
                    - El título queda abajo, solo y con peso visual propio.
                    - La jerarquía es: controles arriba → contenido abajo.

                    Grid 3 columnas (1fr auto 1fr) garantiza que el botón central
                    quede siempre centrado aunque falte prev o next. */}
                <div className="course-learn__nav">
                    <div className="course-learn__nav-side course-learn__nav-side--prev">
                        {prevLesson && (
                            <button
                                className="course-learn__nav-btn"
                                onClick={() => handleLessonChange(prevLesson.id)}
                                aria-label={`Lección anterior: ${prevLesson.title}`}
                            >
                                <span className="course-learn__nav-btn-arrow" aria-hidden="true">←</span>
                                <span className="course-learn__nav-btn-title">{prevLesson.title}</span>
                            </button>
                        )}
                    </div>

                    <div className="course-learn__nav-action">
                        {/* Cada tipo se completa a su manera: un video medible se completa
                            solo (aquí solo se informa el avance); YouTube y las clases en vivo
                            no se pueden medir, así que se marcan a mano; quiz y práctica, al
                            aprobarse. */}
                        {isTrackedVideo && (
                            <WatchProgress percent={watchProgress} completed={isCurrentCompleted} />
                        )}
                        {!isExamLesson && !isCorrectionLesson && !isTrackedVideo && !liveNotStarted && (
                            <button
                                className={`course-learn__complete-btn ${isCurrentCompleted ? 'course-learn__complete-btn--done' : ''}`}
                                onClick={() => handleMarkComplete(activeLesson.id)}
                                disabled={isCurrentCompleted || markingComplete}
                            >
                                {isCurrentCompleted ? 'Completada' : 'Marcar como completada'}
                            </button>
                        )}
                        {isExamLesson && isCurrentCompleted && (
                            <span className="course-learn__complete-btn course-learn__complete-btn--done">
                                Aprobado
                            </span>
                        )}
                        {isCorrectionLesson && isCurrentCompleted && (
                            <span className="course-learn__complete-btn course-learn__complete-btn--done">
                                Aprobada
                            </span>
                        )}
                    </div>

                    <div className="course-learn__nav-side course-learn__nav-side--next">
                        {nextLesson && (
                            <button
                                className="course-learn__nav-btn course-learn__nav-btn--next"
                                onClick={() => handleLessonChange(nextLesson.id)}
                                aria-label={`Lección siguiente: ${nextLesson.title}`}
                            >
                                <span className="course-learn__nav-btn-title">{nextLesson.title}</span>
                                <span className="course-learn__nav-btn-arrow" aria-hidden="true">→</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Info de la lección actual */}
                <div className="course-learn__lesson-info">
                    <h1 className="course-learn__lesson-title">{activeLesson.title}</h1>
                    {activeLesson.description && (
                        <p className="course-learn__lesson-desc">{activeLesson.description}</p>
                    )}
                </div>
            </div>

            {/* Backdrop del drawer en mobile — solo visible cuando el temario
                está abierto. Click cierra. En desktop CSS lo oculta
                (el sidebar vive al costado, no hay superposición). */}
            <div
                className="course-learn__backdrop"
                onClick={() => setIsSidebarOpen(false)}
                aria-hidden="true"
            />

            {/* ── Sidebar: Lista de lecciones ── */}
            <aside id="course-learn-sidebar" className="course-learn__sidebar" aria-hidden={!isSidebarOpen}>
                <div className="course-learn__sidebar-header">
                    <button
                        type="button"
                        className="course-learn__sidebar-closer"
                        onClick={() => setIsSidebarOpen(false)}
                        aria-label="Cerrar temario"
                        title="Cerrar temario"
                    >
                        ›
                    </button>
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
                                            : lesson.type === LessonType.CORRECTION
                                                ? '✏️'
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
