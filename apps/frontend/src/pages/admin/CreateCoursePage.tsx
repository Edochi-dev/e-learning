import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { CourseGateway } from '../../gateways/CourseGateway';
import { ThumbnailUploader, type ThumbnailUploaderHandle } from '../../components/ThumbnailUploader';
import { useToast } from '../../components/Toast';
import type { CreateCoursePayload } from '@maris-nails/shared';

interface CreateCoursePageProps {
    gateway: CourseGateway;
}

export const CreateCoursePage: React.FC<CreateCoursePageProps> = ({ gateway: courseGateway }) => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();
    // useRef en lugar de useState: no necesitamos re-renderizar al cambiar el archivo.
    // Solo necesitamos acceder al componente en el momento del submit para pedir
    // el archivo ya recortado con getCroppedFile().
    const thumbnailRef = useRef<ThumbnailUploaderHandle>(null);

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
        setIsLoading(true);

        try {
            // Pedimos al componente hijo el archivo ya recortado con Canvas.
            // Si el admin no subió imagen, getCroppedFile() devuelve null.
            const croppedFile = await thumbnailRef.current?.getCroppedFile() ?? null;
            await courseGateway.create(formData, croppedFile ?? undefined);
            navigate('/admin');
        } catch (err: any) {
            toast.error(err.message || 'Error al crear el curso');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="admin-page" style={{ maxWidth: '640px' }}>
            <Link to="/admin/cursos" className="back-link">← Volver a Cursos</Link>

            <div className="admin-form">
                <h1>Crear Nuevo Curso</h1>
                <p className="admin-form-subtitle">Completa los datos para agregar un curso a la plataforma.</p>

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

                    <div className="form-group">
                        <ThumbnailUploader ref={thumbnailRef} />
                    </div>

                    <button type="submit" className="btn-primary" disabled={isLoading} style={{ width: '100%', marginTop: '0.5rem' }}>
                        {isLoading ? 'Creando...' : 'Crear Curso'}
                    </button>
                </form>
            </div>
        </div>
    );
};
