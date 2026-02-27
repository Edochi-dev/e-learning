import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { HttpCourseGateway } from '../../gateways/HttpCourseGateway';
import { useAuth } from '../../context/AuthContext';
import type { Course } from '@maris-nails/shared';

export const AdminDashboardPage: React.FC = () => {
    const courseGateway = useMemo(() => new HttpCourseGateway('http://localhost:3000'), []);
    const { token } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // ID del curso que está en modo "¿Confirmar eliminación?"
    // null = ningún curso está en ese estado
    const [confirmingId, setConfirmingId] = useState<string | null>(null);

    // ID del curso que está siendo eliminado ahora mismo (para mostrar spinner)
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Guardamos el ID del temporizador de confirmación para poder cancelarlo.
    // useRef (no useState) porque cambiar el timer no debe disparar re-renders.
    const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const loadCourses = async () => {
            try {
                const data = await courseGateway.findAll();
                setCourses(data);
            } catch (err) {
                console.error('Error loading courses', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadCourses();
    }, []);

    /**
     * Lógica de confirmación en dos pasos:
     *
     * Primer clic → el botón entra en modo "¿Eliminar?" y se activa un timer
     *               de 3 segundos. Si el usuario no confirma, vuelve al estado normal.
     *
     * Segundo clic (en modo confirmar) → ejecuta el borrado real.
     *
     * Si el usuario hace clic en OTRO curso mientras uno está en modo confirmar,
     * cancelamos el timer anterior y ponemos el nuevo en modo confirmar.
     */
    const handleDeleteClick = async (courseId: string) => {
        if (confirmingId === courseId) {
            // Segundo clic → confirmar y ejecutar
            if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
            setConfirmingId(null);
            await executeDeletion(courseId);
        } else {
            // Primer clic → entrar en modo confirmar
            if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
            setConfirmingId(courseId);

            // Auto-cancelar después de 3 segundos si el usuario no confirma
            confirmTimerRef.current = setTimeout(() => {
                setConfirmingId(null);
            }, 3000);
        }
    };

    const executeDeletion = async (courseId: string) => {
        if (!token) return;
        setDeletingId(courseId);
        try {
            await courseGateway.delete(courseId, token);
            // Actualizar la lista local sin hacer otro fetch al servidor
            setCourses(prev => prev.filter(c => c.id !== courseId));
        } catch (err) {
            console.error('Error al eliminar curso', err);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="admin-page">
            <div className="admin-header">
                <h1>Panel de Administración</h1>
                <p>Gestiona tus cursos y contenido desde aquí.</p>
            </div>

            <div className="admin-grid">
                {/* Crear Curso */}
                <div className="admin-card">
                    <div className="admin-card-icon">✨</div>
                    <h3>Crear Curso</h3>
                    <p>Agrega un nuevo curso a la plataforma con título, descripción y precio.</p>
                    <Link to="/admin/courses/new" className="btn-primary" style={{ width: '100%', textAlign: 'center' }}>
                        Crear Nuevo Curso
                    </Link>
                </div>

                {/* Editar / Eliminar Cursos */}
                <div className="admin-card">
                    <div className="admin-card-icon">✏️</div>
                    <h3>Gestionar Cursos</h3>
                    <p>Edita los datos del curso o elimínalo. La eliminación también borra sus lecciones.</p>
                    {isLoading ? (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cargando cursos...</p>
                    ) : courses.length === 0 ? (
                        <div className="admin-empty">No hay cursos aún.</div>
                    ) : (
                        <div className="admin-course-links">
                            {courses.map(course => (
                                /*
                                 * Cada fila tiene dos acciones: Editar y Eliminar.
                                 * No es mala práctica — es el patrón estándar de CRUD.
                                 * La clave es la jerarquía visual:
                                 *   - Editar: acción principal, link prominente
                                 *   - Eliminar: acción destructiva, botón pequeño y discreto
                                 *              que requiere confirmación (doble clic)
                                 */
                                <div key={course.id} className="admin-course-row">
                                    <Link
                                        to={`/admin/courses/${course.id}/edit`}
                                        className="admin-course-link"
                                    >
                                        <span className="admin-course-link-title">{course.title}</span>
                                        <span className="admin-course-link-meta">
                                            {course.lessons?.length || 0} lecciones
                                        </span>
                                    </Link>

                                    <button
                                        className={`admin-course-delete ${confirmingId === course.id ? 'admin-course-delete--confirm' : ''}`}
                                        onClick={() => handleDeleteClick(course.id)}
                                        disabled={deletingId === course.id}
                                        aria-label={confirmingId === course.id ? 'Confirmar eliminación' : `Eliminar ${course.title}`}
                                    >
                                        {deletingId === course.id
                                            ? '...'
                                            : confirmingId === course.id
                                                ? '¿Eliminar?'
                                                : <Trash2 size={15} strokeWidth={2} color="#1a1a1a" />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
