import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HttpCourseGateway } from '../../gateways/HttpCourseGateway';
import type { UpdateCoursePayload } from '@maris-nails/shared';

export const EditCoursePage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const { token } = useAuth();
    const courseGateway = useMemo(() => new HttpCourseGateway('http://localhost:3000'), []);

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<UpdateCoursePayload>({
        title: '',
        description: '',
        price: 0,
        isLive: false,
    });

    useEffect(() => {
        const loadCourse = async () => {
            if (!courseId) return;
            try {
                const course = await courseGateway.findOne(courseId);
                setFormData({
                    title: course.title,
                    description: course.description,
                    price: course.price,
                    isLive: course.isLive,
                });
            } catch (err: any) {
                setError(err.message || 'Error al cargar el curso');
            } finally {
                setIsLoading(false);
            }
        };
        loadCourse();
    }, [courseId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) :
                type === 'checkbox' ? (e.target as HTMLInputElement).checked :
                    value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !courseId) return;

        setIsSubmitting(true);
        setError(null);

        try {
            await courseGateway.update(courseId, formData, token);
            navigate('/admin');
        } catch (err: any) {
            setError(err.message || 'Error al actualizar el curso');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="container" style={{ padding: '2rem' }}>Cargando curso...</div>;
    }

    return (
        <div className="container" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
            <Link to="/admin" style={{ color: 'var(--primary-color)', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}>
                ← Volver al Panel
            </Link>

            <h1>Editar Curso</h1>

            {error && <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                    <label htmlFor="title" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Título</label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
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
                        rows={4}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}
                    />
                </div>

                <div>
                    <label htmlFor="price" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Precio (USD)</label>
                    <input
                        type="number"
                        id="price"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        required
                        min="0"
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                        type="checkbox"
                        id="isLive"
                        name="isLive"
                        checked={formData.isLive}
                        onChange={handleChange}
                    />
                    <label htmlFor="isLive">¿Es un curso en vivo?</label>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary"
                    style={{ marginTop: '0.5rem', width: '100%', padding: '0.75rem' }}
                >
                    {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </form>
        </div>
    );
};
