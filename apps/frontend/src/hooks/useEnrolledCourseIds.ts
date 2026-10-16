import { useMemo } from 'react';
import type { EnrollmentGateway } from '../gateways/EnrollmentGateway';
import { useEnrollments } from './useEnrollments';

/** Ids de los cursos con acceso vigente de quien mira (vacío sin sesión). */
export const useEnrolledCourseIds = (gateway: EnrollmentGateway): ReadonlySet<string> => {
    const { enrollments } = useEnrollments(gateway);
    return useMemo(
        () => new Set(enrollments.filter((e) => e.isActive).map((e) => e.course.id)),
        [enrollments],
    );
};
