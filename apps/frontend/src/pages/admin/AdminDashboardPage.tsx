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
        <div className="container" style={{ padding: '2rem' }}>
            <h1>Panel de Administración</h1>
            <div style={{ marginTop: '2rem', display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <h3>Crear Curso</h3>
                    <p>Agrega un nuevo curso a la plataforma.</p>
                    <Link to="/admin/courses/new" className="button" style={{ display: 'inline-block', marginTop: '1rem' }}>
                        Crear Nuevo Curso
                    </Link>
                </div>

                <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <h3>Gestionar Lecciones</h3>
                    <p>Agrega o elimina lecciones de tus cursos.</p>
                    {isLoading ? (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Cargando cursos...</p>
                    ) : courses.length === 0 ? (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No hay cursos aún. Crea uno primero.</p>
                    ) : (
                        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {courses.map(course => (
                                <Link
                                    key={course.id}
                                    to={`/admin/courses/${course.id}/lessons`}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.5rem 0.75rem',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-color)',
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        fontSize: '0.9rem',
                                    }}
                                >
                                    <span>{course.title}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        {course.lessons?.length || 0} lecciones →
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
