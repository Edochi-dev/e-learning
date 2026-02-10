import { Link } from 'react-router-dom';
import type { CourseGateway } from '../gateways/CourseGateway';
import { useCourses } from '../hooks/useCourses';

interface HomePageProps {
    gateway: CourseGateway;
}

export const HomePage = ({ gateway }: HomePageProps) => {
    const { courses, loading, error } = useCourses(gateway);

    return (
        <>
            <section className="hero">
                <div className="container">
                    <h1>Domina el Arte de las Uñas</h1>
                    <p>Fórmate con las mejores técnicas actuales y convierte tu pasión en una profesión rentable.</p>
                    <a href="#cursos" className="btn-primary">Ver Cursos Disponibles</a>
                </div>
            </section>

            <section id="cursos" className="container">
                <div className="courses-grid">
                    {loading ? (
                        <p style={{ gridColumn: '1/-1', textAlign: 'center', fontSize: '1.2rem', color: '#666' }}>Cargando cursos...</p>
                    ) : error ? (
                        <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'red' }}>Error: {error}</p>
                    ) : courses.length > 0 ? (
                        courses.map((course) => (
                            <article key={course.id} className="course-card">
                                <div className="course-image-placeholder">
                                    <span>💅</span>
                                </div>
                                <div className="course-content">
                                    <h3 className="course-title">{course.title}</h3>
                                    <p className="course-desc">{course.description || 'Domina esta técnica con nuestra metodología paso a paso.'}</p>
                                    <div className="course-footer">
                                        <span className="price">${course.price}</span>
                                        {course.isLive ? (
                                            <span className="badge badge-live">EN VIVO 🔴</span>
                                        ) : (
                                            <span className="badge badge-recorded">CLASE GRABADA 📼</span>
                                        )}
                                    </div>
                                    <Link to={`/courses/${course.id}`} className="btn-primary card-action-btn">
                                        Ver Detalles
                                    </Link>
                                </div>
                            </article>
                        ))
                    ) : (
                        <p>No se encontraron cursos disponibles por el momento.</p>
                    )}
                </div>
            </section>
        </>
    );
};
