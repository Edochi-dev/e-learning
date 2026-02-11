import { useParams, Link } from 'react-router-dom';
import type { CourseGateway } from '../gateways/CourseGateway';
import { useCourse } from '../hooks/useCourse';

interface CourseDetailsPageProps {
    gateway: CourseGateway;
}

export const CourseDetailsPage = ({ gateway }: CourseDetailsPageProps) => {
    const { id } = useParams<{ id: string }>();
    const { course, loading, error } = useCourse(gateway, id);

    if (loading) return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Cargando detalles del curso...</div>;
    if (error) return <div className="container" style={{ padding: '4rem 0', textAlign: 'center', color: 'red' }}>Error: {error}</div>;
    if (!course) return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Curso no encontrado</div>;

    return (
        <div className="container" style={{ padding: '4rem 0' }}>
            <Link to="/" className="btn-secondary" style={{ marginBottom: '2rem' }}>
                <span>←</span> Volver al listado
            </Link>

            <div className="course-details-card">
                <h1 style={{ fontFamily: 'var(--font-heading)', color: 'var(--primary-color)', fontSize: '2.5rem', marginBottom: '1rem' }}>{course.title}</h1>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                    {course.isLive ? (
                        <span className="badge badge-live">EN VIVO 🔴</span>
                    ) : (
                        <span className="badge badge-recorded">CLASE GRABADA 📼</span>
                    )}
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>${course.price}</span>
                </div>

                <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#444', marginBottom: '2rem' }}>
                    {course.description}
                </p>

                <button className="btn-primary">Inscribirme Ahora</button>

                <div className="lessons-section">
                    <h2 className="lessons-title">Contenido del Curso</h2>

                    {course.lessons && course.lessons.length > 0 ? (
                        <div className="lessons-list">
                            {course.lessons.map((lesson) => (
                                <div key={lesson.id} className="lesson-card">
                                    <div className="lesson-content">
                                        <div className="lesson-info">
                                            <span className="lesson-icon">▶</span>
                                            <div>
                                                <h4 className="lesson-title">{lesson.title}</h4>
                                                <p className="lesson-description">{lesson.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="lesson-duration">{lesson.duration}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-lessons">
                            Próximamente se añadirán las lecciones 🚧
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
