import { useEffect, useState } from 'react';
import type { CourseOverview } from '@maris-nails/shared';
import type { EnrollmentGateway } from '../gateways/EnrollmentGateway';

/** Avance de la alumna en un curso; solo se pide si tiene acceso vigente. */
export const useCourseOverview = (gateway: EnrollmentGateway, courseId: string | undefined, enabled: boolean) => {
    const [overview, setOverview] = useState<CourseOverview | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!courseId || !enabled) return;
        let cancelled = false;
        gateway.getCourseOverview(courseId)
            .then((data) => { if (!cancelled) setOverview(data); })
            .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Error desconocido'); });
        return () => { cancelled = true; };
    }, [gateway, courseId, enabled]);

    return { overview, error };
};
