import React, { useId } from 'react';
import {
    LIVE_DURATION_OPTIONS,
    addMinutesToLocalInput,
    durationBetween,
    formatDuration,
} from '../lib/live-schedule';

interface Props {
    /** Local "YYYY-MM-DDTHH:MM" values, as the lesson forms hold them. */
    liveStartsAt?: string;
    liveEndsAt?: string;
    onChange: (patch: { liveStartsAt: string; liveEndsAt: string }) => void;
}

/**
 * Start time plus an approximate duration for a live class. Nobody knows when
 * a stream will really end, so the end time is derived, never asked for.
 */
export const LiveScheduleFields: React.FC<Props> = ({ liveStartsAt, liveEndsAt, onChange }) => {
    const id = useId();
    const duration = durationBetween(liveStartsAt, liveEndsAt);
    const options = LIVE_DURATION_OPTIONS.includes(duration)
        ? LIVE_DURATION_OPTIONS
        : [...LIVE_DURATION_OPTIONS, duration].sort((a, b) => a - b);

    const update = (start: string, minutes: number) =>
        onChange({ liveStartsAt: start, liveEndsAt: start ? addMinutesToLocalInput(start, minutes) : '' });

    return (
        <div className="form-row live-schedule-row">
            <div>
                <label htmlFor={`${id}-start`}>Inicio de la clase en vivo</label>
                <input
                    type="datetime-local"
                    id={`${id}-start`}
                    value={liveStartsAt ?? ''}
                    onChange={e => update(e.target.value, duration)}
                    required
                />
            </div>
            <div>
                <label htmlFor={`${id}-duration`}>Duración aproximada</label>
                <select
                    id={`${id}-duration`}
                    value={duration}
                    onChange={e => update(liveStartsAt ?? '', Number(e.target.value))}
                >
                    {options.map(minutes => (
                        <option key={minutes} value={minutes}>{formatDuration(minutes)}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};
