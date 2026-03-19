import React, { useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import type { CourseGateway } from '../../gateways/CourseGateway';
import type { Course, Lesson, UpdateCoursePayload, CreateLessonPayload, UpdateLessonPayload } from '@maris-nails/shared';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ============================================================
// Componente interno: SortableLessonItem
//
// Cada lección de la lista es un "sortable item".
// Este componente encapsula todo lo que @dnd-kit necesita
// para hacer una sola lección arrastrable.
//
// Por qué es un componente separado y no JSX inline:
// El hook useSortable() solo funciona dentro de un componente
// React. No se puede llamar dentro de un .map() directamente.
// ============================================================
interface SortableLessonItemProps {
    lesson: Lesson;
    index: number;
    editingLessonId: string | null;
    editLessonForm: UpdateLessonPayload;
    isSubmittingLesson: boolean;
    onStartEditing: (lesson: Lesson) => void;
    onCancelEditing: () => void;
    onEditChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onUpdateLesson: (e: React.FormEvent) => void;
    onRemoveLesson: (id: string) => void;
}

function SortableLessonItem({
    lesson, index, editingLessonId, editLessonForm,
    isSubmittingLesson, onStartEditing, onCancelEditing,
    onEditChange, onUpdateLesson, onRemoveLesson,
}: SortableLessonItemProps) {
    // useSortable le da a este elemento sus superpoderes de drag-and-drop.
    // - attributes: aria-* para accesibilidad
    // - listeners: los eventos de mouse/touch para iniciar el drag
    // - setNodeRef: conecta el DOM real con dnd-kit
    // - transform: la traslación actual mientras se arrastra (ej: translateX(0) translateY(-40px))
    // - transition: el string CSS de animación ('transform 200ms ease')
    // - isDragging: true mientras este elemento está siendo arrastrado
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: lesson.id,
    });

    const style: React.CSSProperties = {
        // CSS.Transform.toString convierte el objeto {x, y, scaleX, scaleY}
        // al string que CSS entiende: 'translate3d(0px, -40px, 0) scaleY(1)'
        transform: CSS.Transform.toString(transform),
        // Cuando isDragging es true, forzamos 'none' para anular el
        // 'transition: all 0.3s' del CSS de .admin-lesson-item.
        // Sin esto, el elemento arrastrado tendría lag de 0.3s siguiendo
        // al cursor, confundiendo la detección de colisiones de dnd-kit.
        // Cuando no arrastramos, usamos el valor de dnd-kit (slide de otros ítems)
        // o undefined para dejar que el CSS de la clase controle.
        transition: isDragging ? 'none' : (transition ?? undefined),
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : 'auto',
        position: 'relative',
    };

    const isEditing = editingLessonId === lesson.id;

    return (
        <div ref={setNodeRef} style={style} className="admin-lesson-item">
            {isEditing ? (
                <form onSubmit={onUpdateLesson} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <input type="text" name="title" value={editLessonForm.title} onChange={onEditChange} placeholder="Título" required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <textarea name="description" value={editLessonForm.description} onChange={onEditChange} placeholder="Descripción" rows={2} required />
                    </div>
                    <div className="form-row">
                        <input type="text" name="duration" value={editLessonForm.duration} onChange={onEditChange} placeholder="Duración" required />
                        <input type="text" name="videoUrl" value={editLessonForm.videoUrl} onChange={onEditChange} placeholder="URL del Video" required />
                    </div>
                    <div className="checkbox-group" style={{ marginBottom: '0.5rem' }}>
                        <input type="checkbox" id={`edit-isLive-${lesson.id}`} name="isLive" checked={!!editLessonForm.isLive} onChange={onEditChange} />
                        <label htmlFor={`edit-isLive-${lesson.id}`}>¿Es en vivo?</label>
                    </div>
                    <div className="admin-actions">
                        <button type="submit" disabled={isSubmittingLesson} className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
                            {isSubmittingLesson ? 'Guardando...' : '💾 Guardar'}
                        </button>
                        <button type="button" onClick={onCancelEditing} className="btn-cancel">Cancelar</button>
                    </div>
                </form>
            ) : (
                <div className="admin-lesson-view">
                    {/* El drag handle: solo esta parte dispara el arrastre.
                        Los listeners van aquí, NO en el contenedor completo,
                        para que los botones de editar/eliminar sigan funcionando. */}
                    <span
                        className="drag-handle"
                        {...attributes}
                        {...listeners}
                        title="Arrastra para reordenar"
                    >
                        ⠿
                    </span>
                    <div className="admin-lesson-info">
                        <h4>{index + 1}. {lesson.title}</h4>
                        <p>{lesson.description}</p>
                        <div className="admin-lesson-meta">
                            <span>⏱ {lesson.duration}</span>
                            <span>🎬 {lesson.videoUrl}</span>
                            <span className={`lesson-mode-badge ${lesson.isLive ? 'live' : 'recorded'}`}>
                                {lesson.isLive ? '🔴 En vivo' : '📼 Grabado'}
                            </span>
                        </div>
                    </div>
                    <div className="admin-actions">
                        <button onClick={() => onStartEditing(lesson)} className="btn-edit">✏️ Editar</button>
                        <button onClick={() => onRemoveLesson(lesson.id)} className="btn-delete">Eliminar</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================
// Componente principal
// ============================================================

/**
 * EditCoursePage — Página de edición de curso y gestión de sus lecciones
 *
 * Permite al administrador:
 * 1. EDITAR los datos del curso (título, descripción, precio, modalidad)
 * 2. REORDENAR lecciones con drag-and-drop (se persiste en el backend)
 * 3. EDITAR lecciones (edición inline)
 * 4. ELIMINAR lecciones (con confirmación)
 * 5. AGREGAR nuevas lecciones
 */
interface EditCoursePageProps {
    gateway: CourseGateway;
}

export const EditCoursePage: React.FC<EditCoursePageProps> = ({ gateway: courseGateway }) => {
    const { courseId } = useParams<{ courseId: string }>();

    // Estado general
    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Estado LOCAL de las lecciones (separado de course para el optimistic update del drag)
    const [lessons, setLessons] = useState<Lesson[]>([]);

    // Estado del formulario del curso
    const [isSubmittingCourse, setIsSubmittingCourse] = useState(false);
    const [courseForm, setCourseForm] = useState<UpdateCoursePayload>({
        title: '',
        description: '',
        price: 0,
        features: [],
    });

    // Estado del panel "Agregar lección" (cerrado por defecto)
    const [isAddingLesson, setIsAddingLesson] = useState(false);

    // Estado del formulario de CREAR lección
    const [isSubmittingLesson, setIsSubmittingLesson] = useState(false);
    const [lessonForm, setLessonForm] = useState<CreateLessonPayload>({
        title: '',
        description: '',
        duration: '',
        videoUrl: '',
        isLive: false,
    });

    // Estado de la edición inline de lecciones
    const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
    const [editLessonForm, setEditLessonForm] = useState<UpdateLessonPayload>({
        title: '',
        description: '',
        duration: '',
        videoUrl: '',
        isLive: false,
    });

    // Configuración de sensores de dnd-kit:
    // - PointerSensor con activationConstraint: el drag solo inicia después de mover
    //   8px. Sin esto, un simple clic en el handle activa un "drag" de 0px que
    //   inmediatamente termina, confundiendo los botones de Editar/Eliminar.
    // - KeyboardSensor: permite reordenar con flechas del teclado (accesibilidad)
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const loadCourse = useCallback(async () => {
        if (!courseId) return;
        try {
            setIsLoading(true);
            const data = await courseGateway.findOne(courseId);
            setCourse(data);
            setLessons(data.lessons ?? []);
            setCourseForm({
                title: data.title,
                description: data.description,
                price: data.price,
                features: data.features ?? [],
            });
        } catch (err: any) {
            setError(err.message || 'Error al cargar el curso');
        } finally {
            setIsLoading(false);
        }
    }, [courseId, courseGateway]);

    useEffect(() => {
        loadCourse();
    }, [loadCourse]);

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

    // --- Handlers de features ---

    const handleFeatureChange = (index: number, value: string) => {
        setCourseForm(prev => {
            const updated = [...(prev.features ?? [])];
            updated[index] = value;
            return { ...prev, features: updated };
        });
    };

    const addFeature = () => {
        setCourseForm(prev => ({
            ...prev,
            features: [...(prev.features ?? []), ''],
        }));
    };

    const removeFeature = (index: number) => {
        setCourseForm(prev => ({
            ...prev,
            features: (prev.features ?? []).filter((_, i) => i !== index),
        }));
    };

    const handleCourseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!courseId) return;
        setIsSubmittingCourse(true);
        setError(null);
        setSuccessMessage(null);
        try {
            await courseGateway.update(courseId, courseForm);
            setSuccessMessage('¡Curso actualizado correctamente!');
        } catch (err: any) {
            setError(err.message || 'Error al actualizar el curso');
        } finally {
            setIsSubmittingCourse(false);
        }
    };

    // --- Handler de REORDENAMIENTO (drag-and-drop) ---

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        // Si no hay destino o el elemento no se movió, no hacemos nada
        if (!over || active.id === over.id) return;
        if (!courseId) return;

        const oldIndex = lessons.findIndex(l => l.id === active.id);
        const newIndex = lessons.findIndex(l => l.id === over.id);

        // arrayMove es la utilidad de dnd-kit que reordena el array.
        // Ej: arrayMove(['A','B','C'], 2, 0) → ['C','A','B']
        const reordered = arrayMove(lessons, oldIndex, newIndex);
        const previousLessons = lessons; // guardar para revertir si falla

        // flushSync fuerza a React a aplicar el cambio de estado de forma SÍNCRONA,
        // antes de que dnd-kit limpie sus transforms internos.
        // Sin esto: dnd-kit resetea los transforms → React aún no re-renderizó →
        // los ítems "regresan" visualmente por un frame antes de que React pinte el nuevo orden.
        flushSync(() => {
            setLessons(reordered);
            setError(null);
            setSuccessMessage(null);
        });

        try {
            await courseGateway.reorderLessons(courseId, reordered.map(l => l.id));
            setSuccessMessage('¡Orden guardado!');
        } catch (err: any) {
            // Revertir al orden anterior si el backend falló
            setLessons(previousLessons);
            setError(err.message || 'Error al guardar el orden');
        }
    };

    // --- Handlers de lecciones: CREAR ---

    const handleLessonChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setLessonForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    const handleAddLesson = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!courseId) return;
        setIsSubmittingLesson(true);
        setError(null);
        setSuccessMessage(null);
        try {
            await courseGateway.addLesson(courseId, lessonForm);
            setLessonForm({ title: '', description: '', duration: '', videoUrl: '', isLive: false });
            setIsAddingLesson(false); // Cerrar el panel tras agregar
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
        if (!courseId) return;
        if (!window.confirm('¿Estás seguro de que quieres eliminar esta lección?')) return;
        setError(null);
        setSuccessMessage(null);
        try {
            await courseGateway.removeLesson(courseId, lessonId);
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
            isLive: lesson.isLive,
        });
    };

    const cancelEditing = () => setEditingLessonId(null);

    const handleEditLessonChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setEditLessonForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    const handleUpdateLesson = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!courseId || !editingLessonId) return;
        setIsSubmittingLesson(true);
        setError(null);
        setSuccessMessage(null);
        try {
            await courseGateway.updateLesson(courseId, editingLessonId, editLessonForm);
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
                        <input type="text" id="title" name="title" value={courseForm.title} onChange={handleCourseChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="description">Descripción</label>
                        <textarea id="description" name="description" value={courseForm.description} onChange={handleCourseChange} required rows={4} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="price">Precio (USD)</label>
                        <input type="number" id="price" name="price" value={courseForm.price} onChange={handleCourseChange} required min="0" />
                    </div>

                    {/* Editor de features (beneficios del curso) */}
                    <div className="form-group">
                        <label>Beneficios del curso</label>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>
                            Aparecen en la card de compra. Ej: "Acceso de por vida", "Certificado al completar".
                        </p>
                        {(courseForm.features ?? []).map((feature, i) => (
                            <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <input
                                    type="text"
                                    value={feature}
                                    onChange={(e) => handleFeatureChange(i, e.target.value)}
                                    placeholder={`Beneficio ${i + 1}`}
                                    style={{ flex: 1 }}
                                />
                                <button
                                    type="button"
                                    onClick={() => removeFeature(i)}
                                    className="btn-secondary"
                                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                                >
                                    Quitar
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addFeature}
                            className="btn-secondary"
                            style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}
                        >
                            + Agregar beneficio
                        </button>
                    </div>

                    <button type="submit" disabled={isSubmittingCourse} className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                        {isSubmittingCourse ? 'Guardando...' : 'Guardar Cambios del Curso'}
                    </button>
                </form>
            </div>

            {/* Sección 2: Lista de lecciones con drag-and-drop */}
            <div className="admin-section" style={{ marginTop: '2.5rem' }}>
                <h2>Lecciones ({lessons.length})</h2>
                {lessons.length === 0 ? (
                    <div className="admin-empty">Este curso aún no tiene lecciones.</div>
                ) : (
                    /*
                     * DndContext: el "motor" del drag-and-drop.
                     * - sensors: qué dispositivos de entrada escucha (mouse, teclado)
                     * - collisionDetection: cómo calcula sobre qué elemento estás
                     * - onDragEnd: qué hacer cuando el usuario suelta el elemento
                     */
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        {/*
                         * SortableContext: le dice a dnd-kit cuáles son los elementos
                         * ordenables y en qué orden están actualmente.
                         * verticalListSortingStrategy: optimizado para listas verticales.
                         * Calcula qué elementos deben moverse (slide) mientras arrastras.
                         */}
                        <SortableContext
                            items={lessons.map(l => l.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="admin-lesson-list">
                                {lessons.map((lesson, index) => (
                                    <SortableLessonItem
                                        key={lesson.id}
                                        lesson={lesson}
                                        index={index}
                                        editingLessonId={editingLessonId}
                                        editLessonForm={editLessonForm}
                                        isSubmittingLesson={isSubmittingLesson}
                                        onStartEditing={startEditing}
                                        onCancelEditing={cancelEditing}
                                        onEditChange={handleEditLessonChange}
                                        onUpdateLesson={handleUpdateLesson}
                                        onRemoveLesson={handleRemoveLesson}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {/* Sección 3: Panel colapsable para agregar lección */}
            <div className="admin-section">
                {/* Botón toggle — siempre visible */}
                <button
                    type="button"
                    className="add-lesson-toggle"
                    onClick={() => setIsAddingLesson(prev => !prev)}
                    aria-expanded={isAddingLesson}
                >
                    <span className={`add-lesson-toggle-icon ${isAddingLesson ? 'open' : ''}`}>＋</span>
                    {isAddingLesson ? 'Cancelar' : 'Agregar Nueva Lección'}
                </button>

                {/* Formulario — solo visible cuando isAddingLesson es true */}
                <div className={`add-lesson-panel ${isAddingLesson ? 'open' : ''}`}>
                    <div className="admin-form" style={{ marginTop: '1rem' }}>
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
                            <div className="form-group">
                                <div className="checkbox-group">
                                    <input type="checkbox" id="lesson-isLive" name="isLive" checked={lessonForm.isLive} onChange={handleLessonChange} />
                                    <label htmlFor="lesson-isLive">¿Es una lección en vivo?</label>
                                </div>
                            </div>

                        <button type="submit" disabled={isSubmittingLesson} className="btn-primary" style={{ width: '100%' }}>
                                {isSubmittingLesson ? 'Agregando...' : 'Agregar Lección'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
