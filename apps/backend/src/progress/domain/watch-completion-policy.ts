import { AUTO_COMPLETE_WATCH_PERCENT } from '@maris-nails/shared';

/**
 * Watching this much of a class video completes it on its own: the student
 * clearly saw it, even if she forgot to press "Marcar como completada".
 * The threshold lives in the shared package because the UI announces it.
 */
export function completesByWatching(percent: number): boolean {
  return percent >= AUTO_COMPLETE_WATCH_PERCENT;
}
