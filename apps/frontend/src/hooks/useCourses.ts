import { useState, useEffect } from 'react';
import type { Course } from '@maris-nails/shared';
import type { CourseGateway } from '../gateways/CourseGateway';

export const useCourses = (gateway: CourseGateway) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setLoading(true);
                const data = await gateway.findAll();
                setCourses(data);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, [gateway]);

    return { courses, loading, error };
};
