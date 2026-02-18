
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HttpCourseGateway } from '../../gateways/HttpCourseGateway';
import type { CreateCoursePayload } from '@maris-nails/shared';

// Instanciamos el gateway (en una app real, usaríamos Inyección de Dependencias o un Hook context)
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
        isLive: false,
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
            navigate('/admin'); // Volver al dashboard tras crear
        } catch (err: any) {
            setError(err.message || 'Error al crear el curso');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
            <h1>Crear Nuevo Curso</h1>

            {error && <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

            <form onSubmit={handleSubmit} className="form">
                <div className="form-group">
                    <label htmlFor="title">Título</label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        className="input"
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
                        className="input"
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
                        className="input"
                    />
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                        type="checkbox"
                        id="isLive"
                        name="isLive"
                        checked={formData.isLive}
                        onChange={handleChange}
                    />
                    <label htmlFor="isLive">¿Es un curso en vivo?</label>
                </div>

                <button type="submit" className="button" disabled={isLoading} style={{ marginTop: '1rem', width: '100%' }}>
                    {isLoading ? 'Creando...' : 'Crear Curso'}
                </button>
            </form>
        </div>
    );
};
