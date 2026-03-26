import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

/**
 * Toast — Sistema de notificaciones flotantes.
 *
 * Arquitectura:
 *   ToastProvider (contexto React)
 *     └── ToastContainer (fixed en el viewport, renderiza los toasts)
 *           └── ToastItem (cada notificación individual con animación)
 *
 * Uso desde cualquier componente:
 *   const toast = useToast();
 *   toast.success('¡Curso actualizado!');
 *   toast.error('Error al guardar');
 *
 * El Provider vive en App.tsx y envuelve toda la app.
 * No importa dónde esté scrolleado el usuario — el toast
 * siempre aparece en la parte superior del viewport.
 */

// ── Tipos ──────────────────────────────────────────────────

type ToastType = 'success' | 'error';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
    exiting: boolean;
}

interface ToastContextValue {
    success: (message: string) => void;
    error: (message: string) => void;
}

// ── Contexto ───────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error('useToast debe usarse dentro de un <ToastProvider>');
    }
    return ctx;
}

// ── ToastItem ──────────────────────────────────────────────

// Componente individual de cada toast. Maneja su propia animación
// de salida: cuando exiting=true, aplica la clase CSS de fade-out
// y después de la animación se elimina del array.

interface ToastItemProps {
    toast: Toast;
    onRemove: (id: number) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
    useEffect(() => {
        if (toast.exiting) {
            // Esperar a que termine la animación de salida (300ms) antes de eliminarlo del DOM
            const timer = setTimeout(() => onRemove(toast.id), 300);
            return () => clearTimeout(timer);
        }
    }, [toast.exiting, toast.id, onRemove]);

    return (
        <div className={`toast toast--${toast.type} ${toast.exiting ? 'toast--exit' : ''}`}>
            <span className="toast__icon">
                {toast.type === 'success' ? '✅' : '⚠️'}
            </span>
            <span className="toast__message">{toast.message}</span>
        </div>
    );
}

// ── Provider ───────────────────────────────────────────────

const TOAST_DURATION = 3500; // ms que dura visible antes de empezar a salir

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    // useRef para el counter evita que el id dependa del estado
    // y cause re-renders innecesarios en los callbacks memorizados.
    const nextId = useRef(0);

    const addToast = useCallback((message: string, type: ToastType) => {
        const id = nextId.current++;
        setToasts(prev => [...prev, { id, message, type, exiting: false }]);

        // Después de TOAST_DURATION, marcar como "exiting" para animación de salida
        setTimeout(() => {
            setToasts(prev =>
                prev.map(t => (t.id === id ? { ...t, exiting: true } : t)),
            );
        }, TOAST_DURATION);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const contextValue = useRef<ToastContextValue>({
        success: (msg: string) => addToast(msg, 'success'),
        error: (msg: string) => addToast(msg, 'error'),
    });

    // Actualizar las referencias cuando addToast cambie
    contextValue.current.success = (msg: string) => addToast(msg, 'success');
    contextValue.current.error = (msg: string) => addToast(msg, 'error');

    return (
        <ToastContext.Provider value={contextValue.current}>
            {children}
            {/* Container fixed en el viewport — siempre visible */}
            {toasts.length > 0 && (
                <div className="toast-container">
                    {toasts.map(toast => (
                        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                    ))}
                </div>
            )}
        </ToastContext.Provider>
    );
}
