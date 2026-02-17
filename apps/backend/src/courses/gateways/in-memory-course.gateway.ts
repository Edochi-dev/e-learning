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
            lessons: [
                { id: 'l1', title: 'Introducción a materiales', description: 'Conoce todo lo necesario para empezar.', duration: '15:00', videoUrl: 'http://localhost:3000/videos/videos/clase1.mp4' },
                { id: 'l2', title: 'Preparación de la uña natural', description: 'Pasos vitales para evitar desprendimientos.', duration: '20:00', videoUrl: 'http://localhost:3000/videos/videos/clase2.mp4' },
                { id: 'l3', title: 'Aplicación de tips', description: 'Técnica correcta de pegado y limado.', duration: '25:00', videoUrl: 'http://localhost:3000/videos/videos/clase3.mp4' },
            ]
        },
        {
            id: '2',
            title: 'Nail Art Avanzado',
            price: 80,
            description: 'Técnicas de mano alzada y 3D.',
            isLive: false,
            lessons: [] // Curso sin lecciones aún
        },
        {
            id: '3',
            title: 'Manicura Rusa',
            price: 120,
            description: 'La técnica más limpia y precisa.',
            isLive: true,
            lessons: [
                { id: 'l1', title: 'Uso del torno', description: 'Fresas y velocidades seguras.', duration: '40:00', videoUrl: 'http://localhost:3000/videos/videos/clase1.mp4' },
                { id: 'l2', title: 'Corte de cutícula', description: 'Tijera vs Alicate.', duration: '30:00', videoUrl: 'http://localhost:3000/videos/videos/clase2.mp4' },
            ]
        },
    ];

    async create(course: Course): Promise<Course> {
        this.courses.push(course);
        return course;
    }

    async findAll(): Promise<Course[]> {
        return this.courses;
    }

    async findOne(id: string): Promise<Course | null> {
        const course = this.courses.find((course) => course.id === id) || null;
        if (course) {
            console.log(`[InMemoryGateway] Found course ${id} with ${course.lessons?.length || 0} lessons`);
        }
        return course;
    }
}
