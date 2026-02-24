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
        return <div className="admin-page"><div className="admin-loading">Cargando curso...</div></div>;
    }

    return (
        <div className="admin-page" style={{ maxWidth: '640px' }}>
            <Link to="/admin" className="back-link">← Volver al Panel</Link>

            <div className="admin-form">
                <h1>Editar Curso</h1>
                <p className="admin-form-subtitle">Modifica los datos del curso y guarda los cambios.</p>

                {error && <div className="alert alert-error">⚠️ {error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="title">Título</label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Descripción</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            required
                            rows={4}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="price">Precio (USD)</label>
                        <input
                            type="number"
                            id="price"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            required
                            min="0"
                        />
                    </div>

                    <div className="form-group">
                        <div className="checkbox-group">
                            <input
                                type="checkbox"
                                id="isLive"
                                name="isLive"
                                checked={formData.isLive}
                                onChange={handleChange}
                            />
                            <label htmlFor="isLive">¿Es un curso en vivo?</label>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary"
                        style={{ width: '100%', marginTop: '0.5rem' }}
                    >
                        {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </form>
            </div>
        </div>
    );
};
