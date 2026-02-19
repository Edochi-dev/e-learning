import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HttpCourseGateway } from '../../gateways/HttpCourseGateway';
import type { Course, Lesson, CreateLessonPayload, UpdateLessonPayload } from '@maris-nails/shared';

/**
 * ManageLessonsPage — Página de gestión de lecciones
 *
 * Esta página permite al administrador:
 * 1. VER las lecciones existentes de un curso
 * 2. AGREGAR nuevas lecciones (formulario inferior)
 * 3. EDITAR lecciones existentes (edición inline al hacer click en "Editar")
 * 4. ELIMINAR lecciones (con confirmación)
 *
 * La edición inline funciona así:
 * - Se guarda el ID de la lección que se está editando en `editingLessonId`
 * - Se muestra un formulario pre-poblado con los datos actuales
 * - Al guardar, se envía solo lo que cambió al backend via PATCH
 * - El backend se encarga automáticamente de limpiar archivos huérfanos
 */
export const ManageLessonsPage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const { token } = useAuth();
    const courseGateway = useMemo(() => new HttpCourseGateway('http://localhost:3000'), []);

    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Estado del formulario de CREAR lección
    const [formData, setFormData] = useState<CreateLessonPayload>({
        title: '',
        description: '',
        duration: '',
        videoUrl: '',
    });

    // Estado de la edición inline
    const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<UpdateLessonPayload>({
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

    // --- Handlers para CREAR lección ---

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

    // --- Handlers para ELIMINAR lección ---

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

    // --- Handlers para EDITAR lección ---

    /**
     * Activar edición inline: guarda el ID de la lección y
     * pre-pobla el formulario de edición con los datos actuales.
     */
    const startEditing = (lesson: Lesson) => {
        setEditingLessonId(lesson.id);
        setEditFormData({
            title: lesson.title,
            description: lesson.description,
            duration: lesson.duration,
            videoUrl: lesson.videoUrl,
        });
    };

    const cancelEditing = () => {
        setEditingLessonId(null);
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateLesson = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !courseId || !editingLessonId) return;

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            await courseGateway.updateLesson(courseId, editingLessonId, editFormData, token);
            setEditingLessonId(null);
            setSuccessMessage('¡Lección actualizada!');
            await loadCourse();
        } catch (err: any) {
            setError(err.message || 'Error al actualizar la lección');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Render ---

    if (isLoading) {
        return <div className="container" style={{ padding: '2rem' }}>Cargando curso...</div>;
    }

    if (!course) {
        return <div className="container" style={{ padding: '2rem' }}>Curso no encontrado.</div>;
    }

    const inputStyle = { width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' };

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
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                }}
                            >
                                {/* ¿Estamos editando ESTA lección? */}
                                {editingLessonId === lesson.id ? (
                                    // --- FORMULARIO DE EDICIÓN INLINE ---
                                    <form onSubmit={handleUpdateLesson} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <input type="text" name="title" value={editFormData.title} onChange={handleEditChange} placeholder="Título" style={inputStyle} required />
                                        <textarea name="description" value={editFormData.description} onChange={handleEditChange} placeholder="Descripción" rows={2} style={inputStyle} required />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                            <input type="text" name="duration" value={editFormData.duration} onChange={handleEditChange} placeholder="Duración" style={inputStyle} required />
                                            <input type="text" name="videoUrl" value={editFormData.videoUrl} onChange={handleEditChange} placeholder="URL del Video" style={inputStyle} required />
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                                                {isSubmitting ? 'Guardando...' : '💾 Guardar'}
                                            </button>
                                            <button type="button" onClick={cancelEditing} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer' }}>
                                                Cancelar
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    // --- VISTA NORMAL ---
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <strong>{index + 1}. {lesson.title}</strong>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0' }}>
                                                {lesson.description}
                                            </p>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                ⏱ {lesson.duration} | 🎬 {lesson.videoUrl}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                            <button
                                                onClick={() => startEditing(lesson)}
                                                style={{
                                                    backgroundColor: '#2563eb',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem',
                                                }}
                                            >
                                                ✏️ Editar
                                            </button>
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
                                                }}
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                )}
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
                        <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} required placeholder="Ej: Introducción a materiales" style={inputStyle} />
                    </div>

                    <div>
                        <label htmlFor="description" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Descripción</label>
                        <textarea id="description" name="description" value={formData.description} onChange={handleChange} required rows={3} placeholder="Descripción de la lección..." style={inputStyle} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label htmlFor="duration" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Duración</label>
                            <input type="text" id="duration" name="duration" value={formData.duration} onChange={handleChange} required placeholder="Ej: 15:00" style={inputStyle} />
                        </div>
                        <div>
                            <label htmlFor="videoUrl" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>URL del Video</label>
                            <input type="text" id="videoUrl" name="videoUrl" value={formData.videoUrl} onChange={handleChange} required placeholder="https://... o ruta local" style={inputStyle} />
                        </div>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center', padding: '0.75rem' }}>
                        {isSubmitting ? 'Agregando...' : 'Agregar Lección'}
                    </button>
                </form>
            </section>
        </div>
    );
};
