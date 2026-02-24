import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { HttpCourseGateway } from '../../gateways/HttpCourseGateway';
import type { Course } from '@maris-nails/shared';

export const AdminDashboardPage: React.FC = () => {
    const courseGateway = useMemo(() => new HttpCourseGateway('http://localhost:3000'), []);
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
    }, []);

    return (
        <div className="admin-page">
            <div className="admin-header">
                <h1>Panel de Administración</h1>
                <p>Gestiona tus cursos, lecciones y contenido desde aquí.</p>
            </div>

            <div className="admin-grid">
                {/* Crear Curso */}
                <div className="admin-card">
                    <div className="admin-card-icon">✨</div>
                    <h3>Crear Curso</h3>
                    <p>Agrega un nuevo curso a la plataforma con título, descripción y precio.</p>
                    <Link to="/admin/courses/new" className="btn-primary" style={{ width: '100%', textAlign: 'center' }}>
                        Crear Nuevo Curso
                    </Link>
                </div>

                {/* Gestionar Lecciones */}
                <div className="admin-card">
                    <div className="admin-card-icon">📚</div>
                    <h3>Gestionar Lecciones</h3>
                    <p>Agrega o elimina lecciones de tus cursos.</p>
                    {isLoading ? (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cargando cursos...</p>
                    ) : courses.length === 0 ? (
                        <div className="admin-empty">No hay cursos aún. Crea uno primero.</div>
                    ) : (
                        <div className="admin-course-links">
                            {courses.map(course => (
                                <Link
                                    key={course.id}
                                    to={`/admin/courses/${course.id}/lessons`}
                                    className="admin-course-link"
                                >
                                    <span>{course.title}</span>
                                    <span className="admin-course-link-meta">
                                        {course.lessons?.length || 0} lecciones →
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Editar Cursos */}
                <div className="admin-card">
                    <div className="admin-card-icon">✏️</div>
                    <h3>Editar Cursos</h3>
                    <p>Modifica título, precio o descripción de un curso existente.</p>
                    {isLoading ? (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cargando cursos...</p>
                    ) : courses.length === 0 ? (
                        <div className="admin-empty">No hay cursos aún.</div>
                    ) : (
                        <div className="admin-course-links">
                            {courses.map(course => (
                                <Link
                                    key={course.id}
                                    to={`/admin/courses/${course.id}/edit`}
                                    className="admin-course-link"
                                >
                                    <span>{course.title}</span>
                                    <span className="admin-course-link-meta">Editar →</span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
