import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { CourseGateway } from './gateways/course.gateway';
import { Course } from './entities/course.entity';
import { Lesson } from './entities/lessons.entity';

/**
 * CoursesRepository — Implementación concreta del CourseGateway
 *
 * Esta clase es el "adaptador" que conecta nuestra lógica de negocio
 * con PostgreSQL a través de TypeORM.
 *
 * Nota cómo implementa CourseGateway: cada método abstracto del gateway
 * tiene su implementación aquí con queries reales a la base de datos.
 */
@Injectable()
export class CoursesRepository implements CourseGateway {
    constructor(
        @InjectRepository(Course)
        private readonly courseRepository: Repository<Course>,
        @InjectRepository(Lesson)
        private readonly lessonRepository: Repository<Lesson>,
    ) { }

    // ==========================================
    // Operaciones de Cursos
    // ==========================================

    async create(course: Course): Promise<Course> {
        const newCourse = this.courseRepository.create(course);
        return this.courseRepository.save(newCourse);
    }

    async findAll(): Promise<Course[]> {
        return this.courseRepository.find({ relations: ['lessons'] });
    }

    async findOne(id: string): Promise<Course | null> {
        return this.courseRepository.findOne({
            where: { id },
            relations: ['lessons'],
            order: { lessons: { order: 'ASC' } }, // Siempre devolver lecciones ordenadas
        });
    }

    async update(id: string, data: Partial<Course>): Promise<Course> {
        const course = await this.findOne(id);
        if (!course) {
            throw new NotFoundException(`Course with id ${id} not found`);
        }

        Object.assign(course, data);
        return this.courseRepository.save(course);
    }

    // ==========================================
    // Operaciones de Lecciones
    // ==========================================

    async addLesson(courseId: string, lessonData: Partial<Lesson>): Promise<Lesson> {
        const course = await this.findOne(courseId);
        if (!course) {
            throw new NotFoundException(`Course with id ${courseId} not found`);
        }

        // La nueva lección va al final: su order es igual al total actual de lecciones
        const lesson = this.lessonRepository.create({
            ...lessonData,
            order: course.lessons?.length ?? 0,
            course,
        });
        return this.lessonRepository.save(lesson);
    }

    async removeLesson(lessonId: string): Promise<void> {
        const result = await this.lessonRepository.delete(lessonId);
        if (result.affected === 0) {
            throw new NotFoundException(`Lesson with id ${lessonId} not found`);
        }
    }

    /**
     * Busca una lección por su ID.
     * Necesario para que el UpdateLessonUseCase pueda obtener el videoUrl
     * ACTUAL de la lección antes de actualizarla.
     */
    async findLesson(lessonId: string): Promise<Lesson | null> {
        return this.lessonRepository.findOne({ where: { id: lessonId } });
    }

    /**
     * Actualiza los campos de una lección existente.
     * Object.assign() fusiona los datos nuevos con los existentes,
     * y save() los persiste en la base de datos.
     */
    async updateLesson(lessonId: string, data: Partial<Lesson>): Promise<Lesson> {
        const lesson = await this.findLesson(lessonId);
        if (!lesson) {
            throw new NotFoundException(`Lesson with id ${lessonId} not found`);
        }

        Object.assign(lesson, data);
        return this.lessonRepository.save(lesson);
    }

    /**
     * Actualiza el campo `order` de cada lección según la posición en el array.
     * lessonIds[0] → order 0, lessonIds[1] → order 1, etc.
     *
     * Promise.all() ejecuta todas las actualizaciones en PARALELO para ser eficiente.
     * No tiene sentido esperar a que termine una para empezar la otra.
     */
    async reorderLessons(_courseId: string, lessonIds: string[]): Promise<void> {
        await Promise.all(
            lessonIds.map((lessonId, index) =>
                this.lessonRepository.update(lessonId, { order: index }),
            ),
        );
    }

    /**
     * ¿Alguna OTRA lección usa este videoUrl?
     *
     * La clave está en: where: { videoUrl, id: Not(excludeLessonId) }
     * Esto dice: "busca lecciones con esta URL PERO que NO sean la lección
     * que estamos editando". Si encontramos al menos una, retornamos true
     * y NO borramos el archivo (otra lección lo necesita).
     */
    async isVideoUrlReferenced(videoUrl: string, excludeLessonId: string): Promise<boolean> {
        const count = await this.lessonRepository.count({
            where: {
                videoUrl,
                id: Not(excludeLessonId),
            },
        });
        return count > 0;
    }
}
