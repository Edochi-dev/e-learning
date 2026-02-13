import { useParams, Link, useNavigate } from 'react-router-dom';
import type { CourseGateway } from '../gateways/CourseGateway';
import { useCourse } from '../hooks/useCourse';
import { VideoPlayer } from '../components/VideoPlayer';

interface LessonPageProps {
    gateway: CourseGateway;
}

export const LessonPage = ({ gateway }: LessonPageProps) => {
    const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
    const navigate = useNavigate();
    const { course, loading, error } = useCourse(gateway, courseId);

    if (loading) return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Cargando lección...</div>;
    if (error) return <div className="container" style={{ padding: '4rem 0', textAlign: 'center', color: 'red' }}>Error: {error}</div>;
    if (!course) return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Curso no encontrado</div>;

    const currentLesson = course.lessons.find(l => l.id === lessonId);

    if (!currentLesson) return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Lección no encontrada</div>;

    // Layout: 70% Video Area | 30% Sidebar
    return (
        <div className="container" style={{ padding: '2rem 0', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {/* 70% Video Area */}
            <div style={{ flex: '7', minWidth: '300px' }}>
                <Link to={`/courses/${courseId}`} className="btn-secondary" style={{ marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>←</span> Volver al curso
                </Link>

                <div style={{ marginBottom: '1.5rem' }}>
                    <VideoPlayer
                        src={currentLesson.videoUrl || 'https://www.youtube.com/embed/jfKfPfyJRdk'}
                        title={currentLesson.title}
                    />
                </div>

                <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', marginBottom: '0.5rem' }}>{currentLesson.title}</h1>
                <p style={{ color: 'var(--text-light)', lineHeight: '1.6' }}>{currentLesson.description}</p>
            </div>

            {/* 30% Sidebar */}
            <div style={{ flex: '3', minWidth: '250px' }}>
                <div className="course-details-card" style={{ padding: '1.5rem', position: 'sticky', top: '100px' }}>
                    <h3 style={{ marginTop: 0, fontFamily: 'var(--font-heading)', borderBottom: '1px solid var(--text-light)', paddingBottom: '0.5rem', opacity: 0.5 }}>Temario</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {course.lessons.map((lesson) => (
                            <div
                                key={lesson.id}
                                onClick={() => navigate(`/courses/${courseId}/lessons/${lesson.id}`)}
                                style={{
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    backgroundColor: lesson.id === lessonId ? 'var(--primary-color)' : 'transparent',
                                    color: lesson.id === lessonId ? 'white' : 'var(--text-dark)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    transition: 'all 0.2s'
                                }}
                                className={lesson.id !== lessonId ? 'lesson-item-hover' : ''}
                            >
                                <span style={{ opacity: 0.7 }}>{lesson.id === lessonId ? '▶' : '•'}</span>
                                <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{lesson.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
