import { Injectable } from '@nestjs/common';
import { Course } from '@maris-nails/shared';
import { CourseGateway } from './course.gateway';

@Injectable()
export class InMemoryCourseGateway implements CourseGateway {
    private readonly courses: Course[] = [
        {
            id: '1',
            title: 'Uñas Acrílicas Básicas',
            price: 50,
            description: 'Aprende desde cero a poner uñas acrílicas.',
            isLive: true,
        },
        {
            id: '2',
            title: 'Nail Art Avanzado',
            price: 80,
            description: 'Técnicas de mano alzada y 3D.',
            isLive: false,
        },
        {
            id: '3',
            title: 'Manicura Rusa',
            price: 120,
            description: 'La técnica más limpia y precisa.',
            isLive: true,
        },
    ];

    findAll(): Course[] {
        return this.courses;
    }

    findOne(id: string): Course | null {
        return this.courses.find((course) => course.id === id) || null;
    }
}
