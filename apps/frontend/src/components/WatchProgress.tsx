import { AUTO_COMPLETE_WATCH_PERCENT } from '@maris-nails/shared';

interface WatchProgressProps {
    percent: number;
    completed: boolean;
}

/**
 * Avance de una clase cuyo video se puede medir. No hay botón que marcar:
 * la clase se completa sola al llegar al umbral, así que esto solo informa.
 */
export const WatchProgress = ({ percent, completed }: WatchProgressProps) => {
    if (completed) {
        return <span className="watch-progress watch-progress--done" role="status">✓ Completada</span>;
    }
    const value = Math.min(100, Math.round(percent));
    return (
        <div className="watch-progress">
            <div
                className="watch-progress__bar"
                role="progressbar"
                aria-label="Avance del video"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <div className="watch-progress__fill" style={{ width: `${value}%` }} />
            </div>
            <span className="watch-progress__label">
                {value}% visto · se completa sola al {AUTO_COMPLETE_WATCH_PERCENT}%
            </span>
        </div>
    );
};
