import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HttpCourseGateway } from '../../gateways/HttpCourseGateway';
import type { CreateCoursePayload } from '@maris-nails/shared';

const courseGateway = new HttpCourseGateway('http://localhost:3000');

export const CreateCoursePage: React.FC = () => {
    const navigate = useNavigate();
    const { token } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<CreateCoursePayload>({
        title: '',
        description: '',
        price: 0,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            await courseGateway.create(formData, token);
            navigate('/admin');
        } catch (err: any) {
            setError(err.message || 'Error al crear el curso');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="admin-page" style={{ maxWidth: '640px' }}>
            <Link to="/admin" className="back-link">← Volver al Panel</Link>

            <div className="admin-form">
                <h1>Crear Nuevo Curso</h1>
                <p className="admin-form-subtitle">Completa los datos para agregar un curso a la plataforma.</p>

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
                            placeholder="Ej: Nail Art Avanzado"
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
                            placeholder="Describe el contenido del curso..."
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
                            placeholder="49.99"
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={isLoading} style={{ width: '100%', marginTop: '0.5rem' }}>
                        {isLoading ? 'Creando...' : 'Crear Curso'}
                    </button>
                </form>
            </div>
        </div>
    );
};
