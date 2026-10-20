import React, { useEffect, useId } from 'react';

interface Props {
    title: string;
    onClose: () => void;
    /** false mientras corre una acción: ni Escape ni tocar afuera la cierran. */
    closable?: boolean;
    /** Clase extra del panel, para el contenido propio de cada diálogo. */
    className?: string;
    children: React.ReactNode;
}

/** Marco común de los diálogos: velo, panel, título y cierre con Escape. */
export const Dialog: React.FC<Props> = ({ title, onClose, closable = true, className, children }) => {
    const titleId = useId();

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && closable) onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [closable, onClose]);

    return (
        <div className="confirm-dialog__overlay" onClick={() => closable && onClose()}>
            <div
                className={className ? `confirm-dialog ${className}` : 'confirm-dialog'}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={e => e.stopPropagation()}
            >
                <h2 id={titleId}>{title}</h2>
                {children}
            </div>
        </div>
    );
};
