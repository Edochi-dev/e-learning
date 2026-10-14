import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { UpcomingLiveClass } from '@maris-nails/shared';
import type { EnrollmentGateway } from '../gateways/EnrollmentGateway';
import { liveClassPhase } from '../lib/live-class';

const when = new Intl.DateTimeFormat('es', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
});

/** "Mis próximas clases": hidden when the student has none. */
export const UpcomingLiveClasses: React.FC<{ gateway: EnrollmentGateway }> = ({ gateway }) => {
    const [classes, setClasses] = useState<UpcomingLiveClass[]>([]);

    useEffect(() => {
        gateway.getMyUpcomingLiveClasses().then(setClasses).catch(() => setClasses([]));
    }, [gateway]);

    if (classes.length === 0) return null;
    const now = new Date();

    return (
        <section className="upcoming-live" aria-labelledby="upcoming-live-title">
            <h2 id="upcoming-live-title" className="upcoming-live__title">Mis próximas clases en vivo</h2>
            <ul className="upcoming-live__list">
                {classes.map(c => {
                    const isOpen = liveClassPhase(new Date(c.liveStartsAt), new Date(c.liveEndsAt), now) === 'open';
                    return (
                        <li key={c.lessonId}>
                            <Link to={`/courses/${c.courseId}/learn`} className="upcoming-live__item">
                                <span className="upcoming-live__when">
                                    {isOpen ? '🔴 En vivo ahora' : when.format(new Date(c.liveStartsAt))}
                                </span>
                                <span className="upcoming-live__lesson">{c.lessonTitle}</span>
                                <span className="upcoming-live__course">{c.courseTitle}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};
