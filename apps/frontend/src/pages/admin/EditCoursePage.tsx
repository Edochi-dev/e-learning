import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HttpCourseGateway } from '../../gateways/HttpCourseGateway';
import type { Course, Lesson, UpdateCoursePayload, CreateLessonPayload, UpdateLessonPayload } from '@maris-nails/shared';

/**
 * EditCoursePage — Página de edición de curso y gestión de sus lecciones
 *
 * Permite al administrador:
 * 1. EDITAR los datos del curso (título, descripción, precio, modalidad)
 * 2. VER las lecciones existentes del curso
 * 3. AGREGAR nuevas lecciones
 * 4. EDITAR lecciones (edición inline)
 * 5. ELIMINAR lecciones (con confirmación)
 */
export const EditCoursePage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const { token } = useAuth();
    const courseGateway = useMemo(() => new HttpCourseGateway('http://localhost:3000'), []);

    // Estado general
    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Estado del formulario del curso
    const [isSubmittingCourse, setIsSubmittingCourse] = useState(false);
    const [courseForm, setCourseForm] = useState<UpdateCoursePayload>({
        title: '',
        description: '',
        price: 0,
        isLive: false,
    });

    // Estado del formulario de CREAR lección
    const [isSubmittingLesson, setIsSubmittingLesson] = useState(false);
    const [lessonForm, setLessonForm] = useState<CreateLessonPayload>({
        title: '',
        description: '',
        duration: '',
        videoUrl: '',
    });

    // Estado de la edición inline de lecciones
    const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
    const [editLessonForm, setEditLessonForm] = useState<UpdateLessonPayload>({
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
            setCourseForm({
                title: data.title,
                description: data.description,
                price: data.price,
                isLive: data.isLive,
            });
        } catch (err: any) {
            setError(err.message || 'Error al cargar el curso');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCourse();
    }, [courseId]);

    // --- Handlers del curso ---

    const handleCourseChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setCourseForm(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) :
                type === 'checkbox' ? (e.target as HTMLInputElement).checked :
                    value
        }));
    };

    const handleCourseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !courseId) return;
        setIsSubmittingCourse(true);
        setError(null);
        setSuccessMessage(null);
        try {
            await courseGateway.update(courseId, courseForm, token);
            setSuccessMessage('¡Curso actualizado correctamente!');
        } catch (err: any) {
            setError(err.message || 'Error al actualizar el curso');
        } finally {
            setIsSubmittingCourse(false);
        }
    };

    // --- Handlers de lecciones: CREAR ---

    const handleLessonChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setLessonForm(prev => ({ ...prev, [name]: value }));
    };

    const handleAddLesson = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !courseId) return;
        setIsSubmittingLesson(true);
        setError(null);
        setSuccessMessage(null);
        try {
            await courseGateway.addLesson(courseId, lessonForm, token);
            setLessonForm({ title: '', description: '', duration: '', videoUrl: '' });
            setSuccessMessage('¡Lección agregada exitosamente!');
            await loadCourse();
        } catch (err: any) {
            setError(err.message || 'Error al agregar la lección');
        } finally {
            setIsSubmittingLesson(false);
        }
    };

    // --- Handlers de lecciones: ELIMINAR ---

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

    // --- Handlers de lecciones: EDITAR inline ---

    const startEditing = (lesson: Lesson) => {
        setEditingLessonId(lesson.id);
        setEditLessonForm({
            title: lesson.title,
            description: lesson.description,
            duration: lesson.duration,
            videoUrl: lesson.videoUrl,
        });
    };

    const cancelEditing = () => setEditingLessonId(null);

    const handleEditLessonChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditLessonForm(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateLesson = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !courseId || !editingLessonId) return;
        setIsSubmittingLesson(true);
        setError(null);
        setSuccessMessage(null);
        try {
            await courseGateway.updateLesson(courseId, editingLessonId, editLessonForm, token);
            setEditingLessonId(null);
            setSuccessMessage('¡Lección actualizada!');
            await loadCourse();
        } catch (err: any) {
            setError(err.message || 'Error al actualizar la lección');
        } finally {
            setIsSubmittingLesson(false);
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

            {error && <div className="alert alert-error">⚠️ {error}</div>}
            {successMessage && <div className="alert alert-success">✅ {successMessage}</div>}

            {/* Sección 1: Editar datos del curso */}
            <div className="admin-form">
                <h1>Editar Curso</h1>
                <p className="admin-form-subtitle">Modifica los datos del curso y guarda los cambios.</p>

                <form onSubmit={handleCourseSubmit}>
                    <div className="form-group">
                        <label htmlFor="title">Título</label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={courseForm.title}
                            onChange={handleCourseChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Descripción</label>
                        <textarea
                            id="description"
                            name="description"
                            value={courseForm.description}
                            onChange={handleCourseChange}
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
                            value={courseForm.price}
                            onChange={handleCourseChange}
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
                                checked={courseForm.isLive}
                                onChange={handleCourseChange}
                            />
                            <label htmlFor="isLive">¿Es un curso en vivo?</label>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmittingCourse}
                        className="btn-primary"
                        style={{ width: '100%', marginTop: '0.5rem' }}
                    >
                        {isSubmittingCourse ? 'Guardando...' : 'Guardar Cambios del Curso'}
                    </button>
                </form>
            </div>

            {/* Sección 2: Lista de lecciones existentes */}
            <div className="admin-section" style={{ marginTop: '2.5rem' }}>
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
                                            <input type="text" name="title" value={editLessonForm.title} onChange={handleEditLessonChange} placeholder="Título" required />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <textarea name="description" value={editLessonForm.description} onChange={handleEditLessonChange} placeholder="Descripción" rows={2} required />
                                        </div>
                                        <div className="form-row">
                                            <input type="text" name="duration" value={editLessonForm.duration} onChange={handleEditLessonChange} placeholder="Duración" required />
                                            <input type="text" name="videoUrl" value={editLessonForm.videoUrl} onChange={handleEditLessonChange} placeholder="URL del Video" required />
                                        </div>
                                        <div className="admin-actions">
                                            <button type="submit" disabled={isSubmittingLesson} className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
                                                {isSubmittingLesson ? 'Guardando...' : '💾 Guardar'}
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

            {/* Sección 3: Agregar nueva lección */}
            <div className="admin-section">
                <div className="admin-form">
                    <h2 style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '0.25rem' }}>Agregar Nueva Lección</h2>
                    <p className="admin-form-subtitle">Completa los datos de la nueva lección.</p>

                    <form onSubmit={handleAddLesson}>
                        <div className="form-group">
                            <label htmlFor="lesson-title">Título</label>
                            <input type="text" id="lesson-title" name="title" value={lessonForm.title} onChange={handleLessonChange} required placeholder="Ej: Introducción a materiales" />
                        </div>

                        <div className="form-group">
                            <label htmlFor="lesson-description">Descripción</label>
                            <textarea id="lesson-description" name="description" value={lessonForm.description} onChange={handleLessonChange} required rows={3} placeholder="Descripción de la lección..." />
                        </div>

                        <div className="form-row" style={{ marginBottom: '1.25rem' }}>
                            <div>
                                <label htmlFor="lesson-duration">Duración</label>
                                <input type="text" id="lesson-duration" name="duration" value={lessonForm.duration} onChange={handleLessonChange} required placeholder="Ej: 15:00" />
                            </div>
                            <div>
                                <label htmlFor="lesson-videoUrl">URL del Video</label>
                                <input type="text" id="lesson-videoUrl" name="videoUrl" value={lessonForm.videoUrl} onChange={handleLessonChange} required placeholder="https://... o ruta local" />
                            </div>
                        </div>

                        <button type="submit" disabled={isSubmittingLesson} className="btn-primary" style={{ width: '100%' }}>
                            {isSubmittingLesson ? 'Agregando...' : 'Agregar Lección'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
