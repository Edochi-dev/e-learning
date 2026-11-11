import React, { useState } from 'react';
import { useAppUpdate } from '../hooks/useAppUpdate';

export const UpdatePrompt: React.FC = () => {
    const { updateAvailable, applyUpdate, dismiss } = useAppUpdate();
    const [updating, setUpdating] = useState(false);

    if (!updateAvailable) return null;

    const update = () => {
        setUpdating(true);
        applyUpdate();
    };

    return (
        <div className="update-prompt" role="status">
            <p className="update-prompt__text">Hay una versión nueva disponible.</p>
            <div className="update-prompt__actions">
                <button type="button" className="btn-secondary btn-sm" onClick={dismiss} disabled={updating}>
                    Más tarde
                </button>
                <button type="button" className="btn-primary btn-sm" onClick={update} disabled={updating}>
                    {updating ? 'Actualizando…' : 'Actualizar'}
                </button>
            </div>
        </div>
    );
};
