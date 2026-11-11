import { describe, it, expect } from 'vitest';
import { LessonStatus, LessonType } from '@maris-nails/shared';
import { lessonStatusBadge } from './lesson-status';

describe('lessonStatusBadge', () => {
    it('nombra lo completado según el tipo de lección', () => {
        expect(lessonStatusBadge(LessonType.CLASS, LessonStatus.COMPLETED, 100).label).toBe('Vista');
        expect(lessonStatusBadge(LessonType.EXAM, LessonStatus.COMPLETED, 0).label).toBe('Aprobado');
        expect(lessonStatusBadge(LessonType.CORRECTION, LessonStatus.COMPLETED, 0).label).toBe('Aprobada');
    });

    it('muestra cuánto vio de una clase empezada', () => {
        expect(lessonStatusBadge(LessonType.CLASS, LessonStatus.IN_PROGRESS, 44.6)).toEqual({ label: 'Vista al 45%', tone: 'active' });
    });

    it('marca como atención lo que espera algo de la alumna', () => {
        expect(lessonStatusBadge(LessonType.CORRECTION, LessonStatus.NEEDS_CHANGES, 0).tone).toBe('attention');
        expect(lessonStatusBadge(LessonType.EXAM, LessonStatus.FAILED, 0).tone).toBe('attention');
    });
});
