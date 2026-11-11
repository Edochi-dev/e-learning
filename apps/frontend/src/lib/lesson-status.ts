import { LessonStatus, LessonType } from '@maris-nails/shared';

export type StatusTone = 'done' | 'active' | 'waiting' | 'attention' | 'idle';

export interface StatusBadge {
    label: string;
    tone: StatusTone;
}

export const LESSON_TYPE_LABEL: Record<LessonType, string> = {
    [LessonType.CLASS]: 'Clase',
    [LessonType.EXAM]: 'Quiz',
    [LessonType.CORRECTION]: 'Práctica',
};

const COMPLETED_LABEL: Record<LessonType, string> = {
    [LessonType.CLASS]: 'Vista',
    [LessonType.EXAM]: 'Aprobado',
    [LessonType.CORRECTION]: 'Aprobada',
};

const NOT_STARTED_LABEL: Record<LessonType, string> = {
    [LessonType.CLASS]: 'Sin ver',
    [LessonType.EXAM]: 'Pendiente',
    [LessonType.CORRECTION]: 'Por entregar',
};

const BADGES: Record<LessonStatus, (type: LessonType, watchedPercent: number) => StatusBadge> = {
    [LessonStatus.COMPLETED]: (type) => ({ label: COMPLETED_LABEL[type], tone: 'done' }),
    [LessonStatus.IN_PROGRESS]: (_, pct) => ({ label: `Vista al ${Math.round(pct)}%`, tone: 'active' }),
    [LessonStatus.IN_REVIEW]: () => ({ label: 'En revisión', tone: 'waiting' }),
    [LessonStatus.NEEDS_CHANGES]: () => ({ label: 'Con correcciones', tone: 'attention' }),
    [LessonStatus.FAILED]: () => ({ label: 'Por reintentar', tone: 'attention' }),
    [LessonStatus.NOT_STARTED]: (type) => ({ label: NOT_STARTED_LABEL[type], tone: 'idle' }),
};

export function lessonStatusBadge(type: LessonType, status: LessonStatus, watchedPercent: number): StatusBadge {
    return BADGES[status](type, watchedPercent);
}
