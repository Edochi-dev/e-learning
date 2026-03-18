import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CourseGateway } from '../courses/gateways/course.gateway';
import { Course } from '../courses/entities/course.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const courseGateway = app.get(CourseGateway);

  const coursesToSeed: Partial<Course>[] = [
    {
      title: 'Uñas Acrílicas desde Cero',
      price: 50,
      description:
        'Domina la técnica de uñas acrílicas paso a paso. Desde la preparación de la uña natural hasta la aplicación perfecta de tips y esculpido. Incluye manejo de monómero y polímero, limado profesional y acabados que duran semanas. Ideal para principiantes que quieren empezar a generar ingresos.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80',
      lessons: [
        {
          title: 'Introducción a materiales',
          description: 'Conoce cada producto que vas a usar: monómero, polímero, primers, tips y limas.',
          duration: '15:00',
          videoUrl: '/videos/clase1.mp4',
          order: 1,
          isLive: false,
        },
        {
          title: 'Preparación de la uña natural',
          description: 'Limado, empuje de cutícula y deshidratación. Los pasos que evitan desprendimientos.',
          duration: '20:00',
          videoUrl: '/videos/clase2.mp4',
          order: 2,
          isLive: false,
        },
        {
          title: 'Aplicación de tips',
          description: 'Selección del tamaño correcto, pegado preciso y limado de la unión.',
          duration: '25:00',
          videoUrl: '/videos/clase3.mp4',
          order: 3,
          isLive: false,
        },
        {
          title: 'Esculpido con acrílico',
          description: 'Relación monómero-polímero, bolita perfecta y técnica de presión.',
          duration: '35:00',
          videoUrl: '/videos/clase4.mp4',
          order: 4,
          isLive: false,
        },
        {
          title: 'Limado y acabado final',
          description: 'Forma, curvatura C y sellado con top coat para máxima duración.',
          duration: '20:00',
          videoUrl: '/videos/clase5.mp4',
          order: 5,
          isLive: false,
        },
      ] as any[],
    },
    {
      title: 'Nail Art Avanzado',
      price: 80,
      description:
        'Lleva tus diseños al siguiente nivel. Aprende técnicas de mano alzada, degradados, foil, stamping y decoración 3D. Cada lección incluye práctica guiada para que domines los trazos con confianza. Para alumnas que ya manejan la base y quieren diferenciarse con diseños únicos.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=800&q=80',
      lessons: [
        {
          title: 'Teoría del color en nail art',
          description: 'Combinaciones que funcionan, contrastes y armonías.',
          duration: '18:00',
          videoUrl: '/videos/clase1.mp4',
          order: 1,
          isLive: false,
        },
        {
          title: 'Mano alzada: líneas y flores',
          description: 'Control del pincel liner, presión y velocidad.',
          duration: '30:00',
          videoUrl: '/videos/clase2.mp4',
          order: 2,
          isLive: false,
        },
        {
          title: 'Degradados con esponja y pincel',
          description: 'Baby boomer, ombré vertical y degradados multicolor.',
          duration: '25:00',
          videoUrl: '/videos/clase3.mp4',
          order: 3,
          isLive: false,
        },
        {
          title: 'Foil y stamping',
          description: 'Aplicación de foil sin burbujas y stamping nítido.',
          duration: '22:00',
          videoUrl: '/videos/clase4.mp4',
          order: 4,
          isLive: false,
        },
      ] as any[],
    },
    {
      title: 'Manicura Rusa Profesional',
      price: 120,
      description:
        'La técnica más limpia y precisa del mercado. Aprende el manejo profesional del torno eléctrico, selección de fresas según tipo de cutícula, corte con tijera y alicate, y el acabado impecable que tus clientas van a amar. Certificación incluida al completar.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80',
      lessons: [
        {
          title: 'Anatomía de la uña y cutícula',
          description: 'Entender la estructura para trabajar con seguridad.',
          duration: '15:00',
          videoUrl: '/videos/clase1.mp4',
          order: 1,
          isLive: false,
        },
        {
          title: 'Manejo del torno eléctrico',
          description: 'Fresas diamante vs carburo, RPM seguras y ángulos correctos.',
          duration: '40:00',
          videoUrl: '/videos/clase2.mp4',
          order: 2,
          isLive: false,
        },
        {
          title: 'Levantamiento de cutícula',
          description: 'Técnica de empuje con fresa y pusher metálico.',
          duration: '25:00',
          videoUrl: '/videos/clase3.mp4',
          order: 3,
          isLive: false,
        },
        {
          title: 'Corte de cutícula',
          description: 'Tijera vs alicate: cuándo usar cada uno y técnica de corte limpio.',
          duration: '30:00',
          videoUrl: '/videos/clase4.mp4',
          order: 4,
          isLive: false,
        },
        {
          title: 'Esmaltado y acabado final',
          description: 'Aplicación perfecta de color y top coat sin tocar cutícula.',
          duration: '20:00',
          videoUrl: '/videos/clase5.mp4',
          order: 5,
          isLive: false,
        },
        {
          title: 'Sesión en vivo: práctica con modelo',
          description: 'Manicura rusa completa de principio a fin en tiempo real.',
          videoUrl: '/videos/clase6.mp4',
          order: 6,
          isLive: true,
        },
      ] as any[],
    },
    {
      title: 'Soft Gel y Polygel',
      price: 90,
      description:
        'Dos técnicas modernas en un solo curso. El soft gel es ligero y flexible; el polygel combina lo mejor del acrílico y el gel. Aprende cuándo usar cada uno, moldes vs tips, y cómo lograr extensiones naturales que tus clientas no van a querer sacarse nunca.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&q=80',
      lessons: [
        {
          title: 'Diferencias entre gel, soft gel y polygel',
          description: 'Cuándo recomendar cada sistema a tu clienta.',
          duration: '12:00',
          videoUrl: '/videos/clase1.mp4',
          order: 1,
          isLive: false,
        },
        {
          title: 'Extensión con soft gel y tips',
          description: 'Colocación de full cover tips y aplicación de soft gel.',
          duration: '30:00',
          videoUrl: '/videos/clase2.mp4',
          order: 2,
          isLive: false,
        },
        {
          title: 'Esculpido con polygel y molde dual',
          description: 'Técnica de molde, cantidad de producto y curado.',
          duration: '35:00',
          videoUrl: '/videos/clase3.mp4',
          order: 3,
          isLive: false,
        },
      ] as any[],
    },
    {
      title: 'Pedicura Spa Completa',
      price: 65,
      description:
        'Transforma tu servicio de pedicura en una experiencia spa premium. Desde el remojo terapéutico hasta el esmaltado perfecto, pasando por exfoliación, hidratación profunda y masaje relajante. Aprende a cobrar más ofreciendo una experiencia que tus clientas van a recomendar.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&q=80',
      lessons: [
        {
          title: 'Preparación del spa y productos',
          description: 'Ambientación, higiene y selección de productos de calidad.',
          duration: '10:00',
          videoUrl: '/videos/clase1.mp4',
          order: 1,
          isLive: false,
        },
        {
          title: 'Remojo, exfoliación e hidratación',
          description: 'Sales, scrubs y mascarillas para pies suaves.',
          duration: '25:00',
          videoUrl: '/videos/clase2.mp4',
          order: 2,
          isLive: false,
        },
        {
          title: 'Corte y limado de uñas del pie',
          description: 'Forma correcta para evitar uñas encarnadas.',
          duration: '20:00',
          videoUrl: '/videos/clase3.mp4',
          order: 3,
          isLive: false,
        },
        {
          title: 'Esmaltado en pies y acabado',
          description: 'Técnica de separadores y aplicación sin errores.',
          duration: '15:00',
          videoUrl: '/videos/clase4.mp4',
          order: 4,
          isLive: false,
        },
      ] as any[],
    },
  ];

  console.log('Seeding courses...');
  for (const courseData of coursesToSeed) {
    await courseGateway.create(courseData as Course);
    console.log(`  ✓ "${courseData.title}" — $${courseData.price} (${(courseData.lessons as any[])?.length ?? 0} lecciones)`);
  }

  console.log('\nDone! Courses seeded successfully.');
  await app.close();
}

bootstrap();
