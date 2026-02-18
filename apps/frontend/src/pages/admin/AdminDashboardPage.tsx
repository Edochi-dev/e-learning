
import React from 'react';
import { Link } from 'react-router-dom';

export const AdminDashboardPage: React.FC = () => {
    return (
        <div className="container" style={{ padding: '2rem' }}>
            <h1>Panel de Administración</h1>
            <div style={{ marginTop: '2rem', display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <h3>Gestionar Cursos</h3>
                    <p>Crea, edita o elimina cursos de la plataforma.</p>
                    <Link to="/admin/courses/new" className="button" style={{ display: 'inline-block', marginTop: '1rem' }}>
                        Crear Nuevo Curso
                    </Link>
                </div>
                {/* Aquí se pueden agregar más tarjetas para futuras funcionalidades (Usuarios, Ventas, etc.) */}
            </div>
        </div>
    );
};
