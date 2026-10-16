import React, { useState } from 'react';
import { LIVE_REMINDER_LEAD_MINUTES } from '@maris-nails/shared';
import { useAuth } from '../context/AuthContext';

interface Props {
    lessonId: string;
}

const storageKey = (lessonId: string) => `live-reminder:${lessonId}`;

function wasRequested(lessonId: string): boolean {
    try {
        return localStorage.getItem(storageKey(lessonId)) === '1';
    } catch {
        return false;
    }
}

function rememberRequest(lessonId: string): void {
    try {
        localStorage.setItem(storageKey(lessonId), '1');
    } catch {
        // Private mode: the confirmation simply won't survive a reload.
    }
}

const LEAD_TEXT = LIVE_REMINDER_LEAD_MINUTES === 60 ? '1\u00a0hora' : `${LIVE_REMINDER_LEAD_MINUTES}\u00a0minutos`;

/**
 * Reassurance only, deliberately: the server emails every enrolled student
 * before each live class (SendLiveClassRemindersUseCase), tapped or not. The
 * tap is just remembered on this device so the confirmation stays.
 */
export const LiveReminderButton: React.FC<Props> = ({ lessonId }) => {
    const { user } = useAuth();
    const [requested, setRequested] = useState(() => wasRequested(lessonId));

    if (requested) {
        return (
            <p className="live-reminder live-reminder--done" role="status">
                <span className="live-reminder__check" aria-hidden="true">✓</span>
                <span>
                    ¡Listo! Te avisaremos por correo{user?.email ? <> a <strong>{user.email}</strong></> : null} {LEAD_TEXT} antes.
                </span>
            </p>
        );
    }

    return (
        <button
            type="button"
            className="btn-primary live-reminder"
            onClick={() => {
                rememberRequest(lessonId);
                setRequested(true);
            }}
        >
            🔔 Avísame antes de la clase
        </button>
    );
};
