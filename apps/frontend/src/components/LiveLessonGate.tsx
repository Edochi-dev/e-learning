import React from 'react';
import { LIVE_JOIN_LEAD_MINUTES, type PublicLesson } from '@maris-nails/shared';
import { ACADEMY_TIME_ZONE, formatCountdown, liveClassPhase, openClassLabel } from '../lib/live-class';
import { useNow } from '../hooks/useNow';
import { LiveReminderButton } from './LiveReminderButton';

interface Props {
    lesson: PublicLesson;
    /** The stream player, rendered once the class opens. */
    children: React.ReactNode;
}

const STUDENT_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

const fullDate = new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
});

const academyTime = new Intl.DateTimeFormat('es', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: ACADEMY_TIME_ZONE,
});

/**
 * Shows a live lesson's countdown until its stream opens, then the player.
 * Recorded lessons pass straight through to the player.
 */
export const LiveLessonGate: React.FC<Props> = ({ lesson, children }) => {
    const now = useNow(1000);
    const video = lesson.videoData;

    if (!video?.isLive || !video.liveStartsAt || !video.liveEndsAt) return <>{children}</>;

    const startsAt = new Date(video.liveStartsAt);
    const endsAt = new Date(video.liveEndsAt);
    const phase = liveClassPhase(startsAt, endsAt, now);

    if (phase !== 'upcoming') {
        return (
            <div className="live-gate">
                <p className={`live-gate__banner live-gate__banner--${phase}`}>
                    {phase === 'open' ? openClassLabel(startsAt, now) : 'Clase en vivo finalizada'}
                </p>
                {video.provider ? children : (
                    <div className="live-card">
                        <p className="live-card__countdown">
                            {phase === 'open'
                                ? 'La transmisión aparecerá aquí cuando empiece.'
                                : 'La grabación estará disponible pronto.'}
                        </p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <section className="live-card" aria-labelledby={`live-card-${lesson.id}`}>
            <p className="live-card__eyebrow">Clase en vivo</p>
            <h2 id={`live-card-${lesson.id}`} className="live-card__date">{fullDate.format(startsAt)}</h2>
            {STUDENT_TIME_ZONE !== ACADEMY_TIME_ZONE && (
                <p className="live-card__reference">Hora de Chile: {academyTime.format(startsAt)}</p>
            )}

            <p className="live-card__countdown" aria-live="off">
                Empieza en <strong>{formatCountdown(startsAt.getTime() - now.getTime())}</strong>
            </p>
            <p className="live-card__hint">La transmisión aparecerá aquí {LIVE_JOIN_LEAD_MINUTES} minutos antes de empezar.</p>

            <div className="live-card__actions">
                <LiveReminderButton key={lesson.id} lessonId={lesson.id} />
            </div>
        </section>
    );
};
