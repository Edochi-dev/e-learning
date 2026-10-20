import React from 'react';
import { Dialog } from './Dialog';

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
    return (
        <Dialog title={title} onClose={onCancel} closable={!busy}>
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
        </Dialog>
    );
};
