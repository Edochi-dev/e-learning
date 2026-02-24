import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HttpCourseGateway } from '../../gateways/HttpCourseGateway';
import type { Course, Lesson, CreateLessonPayload, UpdateLessonPayload } from '@maris-nails/shared';

/**
 * ManageLessonsPage — Página de gestión de lecciones
 *
 * Permite al administrador:
 * 1. VER las lecciones existentes de un curso
 * 2. AGREGAR nuevas lecciones
 * 3. EDITAR lecciones (edición inline)
 * 4. ELIMINAR lecciones (con confirmación)
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
        return <div className="admin-page"><div className="admin-loading">Cargando curso...</div></div>;
    }

    if (!course) {
        return <div className="admin-page"><div className="admin-loading">Curso no encontrado.</div></div>;
    }

    return (
        <div className="admin-page" style={{ maxWidth: '860px' }}>
            <Link to="/admin" className="back-link">← Volver al Panel</Link>

            <div className="admin-header">
                <h1>Lecciones de: {course.title}</h1>
                <p>{course.description}</p>
            </div>

            {error && <div className="alert alert-error">⚠️ {error}</div>}
            {successMessage && <div className="alert alert-success">✅ {successMessage}</div>}

            {/* Lista de lecciones existentes */}
            <div className="admin-section">
                <h2>Lecciones ({course.lessons?.length || 0})</h2>
                {(!course.lessons || course.lessons.length === 0) ? (
                    <div className="admin-empty">Este curso aún no tiene lecciones.</div>
                ) : (
                    <div className="admin-lesson-list">
                        {course.lessons.map((lesson: Lesson, index: number) => (
                            <div key={lesson.id} className="admin-lesson-item">
                                {editingLessonId === lesson.id ? (
                                    /* Formulario de edición inline */
                                    <form onSubmit={handleUpdateLesson} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <input type="text" name="title" value={editFormData.title} onChange={handleEditChange} placeholder="Título" required />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <textarea name="description" value={editFormData.description} onChange={handleEditChange} placeholder="Descripción" rows={2} required />
                                        </div>
                                        <div className="form-row">
                                            <input type="text" name="duration" value={editFormData.duration} onChange={handleEditChange} placeholder="Duración" required />
                                            <input type="text" name="videoUrl" value={editFormData.videoUrl} onChange={handleEditChange} placeholder="URL del Video" required />
                                        </div>
                                        <div className="admin-actions">
                                            <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
                                                {isSubmitting ? 'Guardando...' : '💾 Guardar'}
                                            </button>
                                            <button type="button" onClick={cancelEditing} className="btn-cancel">
                                                Cancelar
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    /* Vista normal */
                                    <div className="admin-lesson-view">
                                        <div className="admin-lesson-info">
                                            <h4>{index + 1}. {lesson.title}</h4>
                                            <p>{lesson.description}</p>
                                            <div className="admin-lesson-meta">
                                                <span>⏱ {lesson.duration}</span>
                                                <span>🎬 {lesson.videoUrl}</span>
                                            </div>
                                        </div>
                                        <div className="admin-actions">
                                            <button onClick={() => startEditing(lesson)} className="btn-edit">
                                                ✏️ Editar
                                            </button>
                                            <button onClick={() => handleRemoveLesson(lesson.id)} className="btn-delete">
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Formulario para agregar lección */}
            <div className="admin-section">
                <div className="admin-form">
                    <h2 style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '0.25rem' }}>Agregar Nueva Lección</h2>
                    <p className="admin-form-subtitle">Completa los datos de la nueva lección.</p>

                    <form onSubmit={handleAddLesson}>
                        <div className="form-group">
                            <label htmlFor="title">Título</label>
                            <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} required placeholder="Ej: Introducción a materiales" />
                        </div>

                        <div className="form-group">
                            <label htmlFor="description">Descripción</label>
                            <textarea id="description" name="description" value={formData.description} onChange={handleChange} required rows={3} placeholder="Descripción de la lección..." />
                        </div>

                        <div className="form-row" style={{ marginBottom: '1.25rem' }}>
                            <div>
                                <label htmlFor="duration">Duración</label>
                                <input type="text" id="duration" name="duration" value={formData.duration} onChange={handleChange} required placeholder="Ej: 15:00" />
                            </div>
                            <div>
                                <label htmlFor="videoUrl">URL del Video</label>
                                <input type="text" id="videoUrl" name="videoUrl" value={formData.videoUrl} onChange={handleChange} required placeholder="https://... o ruta local" />
                            </div>
                        </div>

                        <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ width: '100%' }}>
                            {isSubmitting ? 'Agregando...' : 'Agregar Lección'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
