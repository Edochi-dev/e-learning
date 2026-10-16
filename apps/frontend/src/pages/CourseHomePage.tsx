import { Link, useParams } from 'react-router-dom';
import { LessonStatus, type LessonOverview, type PublicLesson } from '@maris-nails/shared';
import type { CourseGateway } from '../gateways/CourseGateway';
import type { EnrollmentGateway } from '../gateways/EnrollmentGateway';
import { useCourse } from '../hooks/useCourse';
import { useEnrollments } from '../hooks/useEnrollments';
import { useCourseOverview } from '../hooks/useCourseOverview';
import { useNow } from '../hooks/useNow';
import { API_URL } from '../config';
import { LESSON_TYPE_LABEL, lessonStatusBadge } from '../lib/lesson-status';
import { liveClassPhase, openClassLabel } from '../lib/live-class';
import { renewWhatsappUrl } from '../lib/whatsapp';

interface CourseHomePageProps {
    courseGateway: CourseGateway;
    enrollmentGateway: EnrollmentGateway;
}

const longDate = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' });
const liveDate = new Intl.DateTimeFormat('es', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});

const lessonUrl = (courseId: string, lessonId: string) => `/courses/${courseId}/learn?leccion=${lessonId}`;

/**
 * Portada del curso para la alumna inscrita: dónde va, qué le falta y por
 * dónde seguir. La ficha (/courses/:id) es para decidir; esta, para estudiar.
 */
export const CourseHomePage = ({ courseGateway, enrollmentGateway }: CourseHomePageProps) => {
    const { courseId } = useParams<{ courseId: string }>();
    const { course, loading: courseLoading, error: courseError } = useCourse(courseGateway, courseId);
    const { enrollments, loading: enrollmentsLoading } = useEnrollments(enrollmentGateway);
    const enrollment = enrollments.find((e) => e.course.id === courseId);
    const isActive = enrollment?.isActive ?? false;
    const { overview } = useCourseOverview(enrollmentGateway, courseId, isActive);
    const now = useNow(30_000);

    if (courseLoading || enrollmentsLoading) {
        return <div className="container course-home"><p className="course-home__muted">Cargando curso…</p></div>;
    }
    if (courseError || !course || !enrollment) {
        return (
            <div className="container course-home course-home--empty">
                <h1>No encontramos este curso en tu cuenta</h1>
                <Link to="/mis-cursos" className="btn-primary">Ir a mis cursos</Link>
            </div>
        );
    }

    const byLesson = new Map<string, LessonOverview>(overview?.lessons.map((l) => [l.lessonId, l]) ?? []);
    const nextLesson = course.lessons.find((l) => l.id === overview?.nextLessonId);
    const completedAll = !!overview && overview.totalLessons > 0 && overview.completedLessons === overview.totalLessons;
    const upcomingLive = course.lessons.filter((l) => {
        const v = l.videoData;
        return v?.isLive && v.liveStartsAt && v.liveEndsAt
            && liveClassPhase(new Date(v.liveStartsAt), new Date(v.liveEndsAt), now) !== 'ended';
    });

    return (
        <div className="container course-home">
            <Link to="/mis-cursos" className="course-home__back">← Mis cursos</Link>

            <header className="course-home__hero">
                <div className="course-home__visual">
                    {course.thumbnailUrl
                        ? <img src={`${API_URL}${course.thumbnailUrl}`} alt="" className="course-thumbnail" />
                        : <span className="course-home__fallback" aria-hidden="true">💅</span>}
                </div>

                <div className="course-home__summary">
                    <p className="course-home__eyebrow">Tu curso</p>
                    <h1 className="course-home__title">{course.title}</h1>
                    <p className="course-home__desc">{course.description}</p>

                    {overview && (
                        <div className="course-home__progress">
                            <div className="progress-bar">
                                <div
                                    className="progress-bar__fill"
                                    style={{ width: `${overview.progressPercent}%` }}
                                    role="progressbar"
                                    aria-label="Avance del curso"
                                    aria-valuenow={overview.progressPercent}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                />
                            </div>
                            <div className="progress-bar__labels">
                                <span className="progress-bar__text">
                                    {overview.completedLessons} de {overview.totalLessons} lecciones
                                </span>
                                <span className="progress-bar__percent">{overview.progressPercent}%</span>
                            </div>
                        </div>
                    )}

                    <p className="course-home__access">
                        {!isActive
                            ? 'Tu acceso a este curso terminó. Tu progreso y tus certificados se conservan.'
                            : enrollment.expiresAt
                                ? `Acceso hasta el ${longDate.format(new Date(enrollment.expiresAt))}`
                                : 'Acceso permanente'}
                    </p>

                    <div className="course-home__actions">
                        {!isActive ? (
                            <a href={renewWhatsappUrl(course.title)} className="btn-primary" target="_blank" rel="noopener noreferrer">
                                Renovar acceso por WhatsApp
                            </a>
                        ) : nextLesson ? (
                            <Link to={lessonUrl(course.id, nextLesson.id)} className="btn-primary course-home__cta">
                                <span>{overview?.completedLessons ? 'Continuar' : 'Empezar el curso'} →</span>
                                <small className="course-home__cta-next">{nextLesson.title}</small>
                            </Link>
                        ) : completedAll ? (
                            <p className="course-home__done">🎉 ¡Completaste el curso!</p>
                        ) : overview ? (
                            <p className="course-home__done">Tus prácticas están en revisión. Te avisaremos cuando la profesora responda.</p>
                        ) : null}
                    </div>
                </div>
            </header>

            {isActive && upcomingLive.length > 0 && (
                <section className="course-home__section" aria-labelledby="course-home-live">
                    <h2 id="course-home-live" className="course-home__heading">Clases en vivo</h2>
                    <ul className="course-home__live">
                        {upcomingLive.map((l) => {
                            const startsAt = new Date(l.videoData!.liveStartsAt!);
                            const open = liveClassPhase(startsAt, new Date(l.videoData!.liveEndsAt!), now) === 'open';
                            return (
                                <li key={l.id}>
                                    <Link to={lessonUrl(course.id, l.id)} className="course-home__live-item">
                                        <span className="course-home__live-when">
                                            {open ? openClassLabel(startsAt, now) : liveDate.format(startsAt)}
                                        </span>
                                        <span>{l.title}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            <section className="course-home__section" aria-labelledby="course-home-syllabus">
                <h2 id="course-home-syllabus" className="course-home__heading">Temario</h2>
                <ol className="course-home__lessons">
                    {course.lessons.map((lesson, index) => (
                        <LessonRow
                            key={lesson.id}
                            lesson={lesson}
                            index={index}
                            progress={byLesson.get(lesson.id)}
                            href={isActive ? lessonUrl(course.id, lesson.id) : null}
                            isNext={lesson.id === nextLesson?.id}
                        />
                    ))}
                </ol>
            </section>

            <section className="course-home__section course-home__certificate">
                <h2 className="course-home__heading">Certificado</h2>
                <p>
                    {completedAll
                        ? 'Completaste todas las lecciones. Tu certificado aparecerá en Mi cuenta → Certificados cuando la profesora lo emita.'
                        : 'Al completar todas las lecciones, la profesora emite tu certificado. Lo verás en Mi cuenta → Certificados.'}
                </p>
            </section>
        </div>
    );
};

interface LessonRowProps {
    lesson: PublicLesson;
    index: number;
    progress: LessonOverview | undefined;
    href: string | null;
    isNext: boolean;
}

const LessonRow = ({ lesson, index, progress, href, isNext }: LessonRowProps) => {
    const badge = lessonStatusBadge(lesson.type, progress?.status ?? LessonStatus.NOT_STARTED, progress?.watchedPercent ?? 0);
    const live = lesson.videoData?.isLive && lesson.videoData.liveStartsAt;
    const meta = live
        ? `Clase en vivo · ${liveDate.format(new Date(lesson.videoData!.liveStartsAt!))}`
        : [LESSON_TYPE_LABEL[lesson.type], lesson.videoData?.duration].filter(Boolean).join(' · ');

    const content = (
        <>
            <span className={`course-home__lesson-index course-home__lesson-index--${badge.tone}`} aria-hidden="true">
                {badge.tone === 'done' ? '✓' : index + 1}
            </span>
            <span className="course-home__lesson-text">
                <span className="course-home__lesson-title">{lesson.title}</span>
                <span className="course-home__lesson-meta">{meta}</span>
            </span>
            <span className={`course-home__badge course-home__badge--${badge.tone}`}>
                {isNext
                    ? `Sigue aquí${progress?.status === LessonStatus.IN_PROGRESS ? ` · ${Math.round(progress.watchedPercent)}%` : ''}`
                    : badge.label}
            </span>
        </>
    );

    return (
        <li>
            {href
                ? <Link to={href} className={`course-home__lesson${isNext ? ' course-home__lesson--next' : ''}`}>{content}</Link>
                : <div className="course-home__lesson course-home__lesson--locked">{content}</div>}
        </li>
    );
};
