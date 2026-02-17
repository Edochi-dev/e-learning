import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CourseGateway } from '../courses/gateways/course.gateway';
import { Course } from '../courses/entities/course.entity';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const courseGateway = app.get(CourseGateway);

    const coursesToSeed: Partial<Course>[] = [
        {
            title: 'Uñas Acrílicas Básicas',
            price: 50,
            description: 'Aprende desde cero a poner uñas acrílicas.',
            isLive: true,
            lessons: [
                { title: 'Introducción a materiales', description: 'Conoce todo lo necesario para empezar.', duration: '15:00', videoUrl: 'http://localhost:3000/videos/videos/clase1.mp4' },
                { title: 'Preparación de la uña natural', description: 'Pasos vitales para evitar desprendimientos.', duration: '20:00', videoUrl: 'http://localhost:3000/videos/videos/clase2.mp4' },
                { title: 'Aplicación de tips', description: 'Técnica correcta de pegado y limado.', duration: '25:00', videoUrl: 'http://localhost:3000/videos/videos/clase3.mp4' },
            ] as any[]
        },
        {
            title: 'Nail Art Avanzado',
            price: 80,
            description: 'Técnicas de mano alzada y 3D.',
            isLive: false,
            lessons: []
        },
        {
            title: 'Manicura Rusa',
            price: 120,
            description: 'La técnica más limpia y precisa.',
            isLive: true,
            lessons: [
                { title: 'Uso del torno', description: 'Fresas y velocidades seguras.', duration: '40:00', videoUrl: 'http://localhost:3000/videos/videos/clase1.mp4' },
                { title: 'Corte de cutícula', description: 'Tijera vs Alicate.', duration: '30:00', videoUrl: 'http://localhost:3000/videos/videos/clase2.mp4' },
            ] as any[]
        },
    ];

    console.log('Seeding courses...');
    for (const courseData of coursesToSeed) {
        // En un escenario real, verificaríamos si ya existe por título o ID.
        // Aquí simplemente creamos.
        await courseGateway.create(courseData as Course);
        console.log(`Course "${courseData.title}" created.`);
    }

    console.log('Courses seeded successfully via Gateway.');
    await app.close();
}

bootstrap();
