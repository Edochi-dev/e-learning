import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HttpCourseGateway } from '../../gateways/HttpCourseGateway';
import type { Course, Lesson, CreateLessonPayload } from '@maris-nails/shared';

export const ManageLessonsPage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const { token } = useAuth();
    const courseGateway = useMemo(() => new HttpCourseGateway('http://localhost:3000'), []);

    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [formData, setFormData] = useState<CreateLessonPayload>({
        title: '',
        description: '',
        duration: '',
        videoUrl: '',
    });

    const loadCourse = async () => {
        if (!courseId) return;
        try {
            setIsLoading(true);
            const data = await courseGateway.findOne(courseId);
            setCourse(data);
        } catch (err: any) {
            setError(err.message || 'Error al cargar el curso');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCourse();
    }, [courseId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddLesson = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !courseId) return;

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            await courseGateway.addLesson(courseId, formData, token);
            setFormData({ title: '', description: '', duration: '', videoUrl: '' });
            setSuccessMessage('¡Lección agregada exitosamente!');
            await loadCourse();
        } catch (err: any) {
            setError(err.message || 'Error al agregar la lección');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveLesson = async (lessonId: string) => {
        if (!token || !courseId) return;
        if (!window.confirm('¿Estás seguro de que quieres eliminar esta lección?')) return;

        setError(null);
        setSuccessMessage(null);

        try {
            await courseGateway.removeLesson(courseId, lessonId, token);
            setSuccessMessage('Lección eliminada.');
            await loadCourse();
        } catch (err: any) {
            setError(err.message || 'Error al eliminar la lección');
        }
    };

    if (isLoading) {
        return <div className="container" style={{ padding: '2rem' }}>Cargando curso...</div>;
    }

    if (!course) {
        return <div className="container" style={{ padding: '2rem' }}>Curso no encontrado.</div>;
    }

    return (
        <div className="container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <Link to="/admin" style={{ color: 'var(--primary-color)', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}>
                ← Volver al Panel
            </Link>

            <h1>Lecciones de: {course.title}</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{course.description}</p>

            {error && <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>{error}</div>}
            {successMessage && <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>{successMessage}</div>}

            {/* Lista de lecciones existentes */}
            <section style={{ marginBottom: '2rem' }}>
                <h2>Lecciones ({course.lessons?.length || 0})</h2>
                {(!course.lessons || course.lessons.length === 0) ? (
                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Este curso aún no tiene lecciones.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {course.lessons.map((lesson: Lesson, index: number) => (
                            <div
                                key={lesson.id}
                                className="card"
                                style={{
                                    padding: '1rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                }}
                            >
                                <div>
                                    <strong>{index + 1}. {lesson.title}</strong>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0' }}>
                                        {lesson.description}
                                    </p>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        ⏱ {lesson.duration} | 🎬 {lesson.videoUrl}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleRemoveLesson(lesson.id)}
                                    style={{
                                        backgroundColor: '#dc2626',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        flexShrink: 0,
                                    }}
                                >
                                    Eliminar
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Formulario para agregar lección */}
            <section>
                <h2>Agregar Nueva Lección</h2>
                <form onSubmit={handleAddLesson} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label htmlFor="title" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Título</label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            placeholder="Ej: Introducción a materiales"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}
                        />
                    </div>

                    <div>
                        <label htmlFor="description" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Descripción</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            required
                            rows={3}
                            placeholder="Descripción de la lección..."
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label htmlFor="duration" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Duración</label>
                            <input
                                type="text"
                                id="duration"
                                name="duration"
                                value={formData.duration}
                                onChange={handleChange}
                                required
                                placeholder="Ej: 15:00"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}
                            />
                        </div>
                        <div>
                            <label htmlFor="videoUrl" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>URL del Video</label>
                            <input
                                type="text"
                                id="videoUrl"
                                name="videoUrl"
                                value={formData.videoUrl}
                                onChange={handleChange}
                                required
                                placeholder="https://... o ruta local"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary"
                        style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center', padding: '0.75rem' }}
                    >
                        {isSubmitting ? 'Agregando...' : 'Agregar Lección'}
                    </button>
                </form>
            </section>
        </div>
    );
};
