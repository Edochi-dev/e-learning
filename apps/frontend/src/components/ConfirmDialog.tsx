import React, { useEffect, useId } from 'react';

interface Props {
    title: string;
    confirmLabel: string;
    busyLabel: string;
    busy: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    children: React.ReactNode;
}

/** Destructive-action confirmation. Cannot be dismissed while the action runs. */
export const ConfirmDialog: React.FC<Props> = ({
    title,
    confirmLabel,
    busyLabel,
    busy,
    onConfirm,
    onCancel,
    children,
}) => {
    const titleId = useId();

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !busy) onCancel();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [busy, onCancel]);

    return (
        <div className="confirm-dialog__overlay" onClick={() => !busy && onCancel()}>
            <div
                className="confirm-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={e => e.stopPropagation()}
            >
                <h2 id={titleId}>{title}</h2>
                {children}
                <div className="confirm-dialog__actions">
                    {/* Focus starts on Cancel so a stray Enter cannot confirm a deletion. */}
                    <button type="button" className="btn-secondary" disabled={busy} onClick={onCancel} autoFocus>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="btn-danger btn-danger--solid"
                        disabled={busy}
                        onClick={onConfirm}
                    >
                        {busy ? busyLabel : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
