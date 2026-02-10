import { useState, useEffect } from 'react';
import type { Course } from '@maris-nails/shared';
import type { CourseGateway } from '../gateways/CourseGateway';

export const useCourse = (gateway: CourseGateway, id: string | undefined) => {
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCourse = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const data = await gateway.findOne(id);
                setCourse(data);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchCourse();
    }, [gateway, id]);

    return { course, loading, error };
};
