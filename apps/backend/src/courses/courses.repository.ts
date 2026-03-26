import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { CourseGateway } from './gateways/course.gateway';
import { LessonGateway } from './gateways/lesson.gateway';
import { PaginatedResult } from '../common/types/paginated-result.type';
import { Course } from './entities/course.entity';
import { Lesson } from './entities/lessons.entity';
import { VideoLesson } from './entities/video-lesson.entity';
import { ExamLesson } from './entities/exam-lesson.entity';
import { QuizQuestion } from './entities/quiz-question.entity';

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
export class CoursesRepository implements CourseGateway, LessonGateway {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(VideoLesson)
    private readonly videoLessonRepository: Repository<VideoLesson>,
    @InjectRepository(ExamLesson)
    private readonly examLessonRepository: Repository<ExamLesson>,
    @InjectRepository(QuizQuestion)
    private readonly quizQuestionRepository: Repository<QuizQuestion>,
  ) {}

  // ==========================================
  // Operaciones de Cursos
  // ==========================================

  async create(course: Course): Promise<Course> {
    const newCourse = this.courseRepository.create(course);
    return this.courseRepository.save(newCourse);
  }

  async findAll(page: number, limit: number): Promise<PaginatedResult<Course>> {
    const [data, total] = await this.courseRepository.findAndCount({
      relations: ['lessons', 'lessons.videoData', 'lessons.examData'],
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Course | null> {
    return this.courseRepository.findOne({
      where: { id },
      // Cargamos lessons + sus questions + options para que el admin vea el quiz completo.
      // Para el alumno, el Use Case filtra isCorrect antes de devolver.
      relations: ['lessons', 'lessons.videoData', 'lessons.examData', 'lessons.questions', 'lessons.questions.options'],
      order: {
        lessons: {
          order: 'ASC',
          questions: { order: 'ASC' },
        },
      },
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

  /**
   * Elimina un curso por su ID.
   *
   * Usamos delete() (SQL directo) porque la entidad Lesson tiene
   * onDelete: 'CASCADE' en su @ManyToOne. Eso significa que la propia
   * base de datos borra las lecciones asociadas automáticamente al
   * recibir el DELETE del curso — sin pasar por el ORM.
   *
   * Esta es la solución más robusta: funciona con cualquier cliente
   * (ORM, SQL directo, psql) porque el contrato vive en la DB, no en el código.
   */
  async delete(id: string): Promise<void> {
    const result = await this.courseRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Course with id ${id} not found`);
    }
  }

  // ==========================================
  // Operaciones de Lecciones
  // ==========================================

  async addLesson(
    courseId: string,
    lessonData: Partial<Lesson> & Record<string, any>,
  ): Promise<Lesson> {
    const course = await this.findOne(courseId);
    if (!course) {
      throw new NotFoundException(`Course with id ${courseId} not found`);
    }

    // Crear la entidad base con solo los campos comunes
    const lesson = this.lessonRepository.create({
      title: lessonData.title,
      description: lessonData.description,
      type: lessonData.type,
      order: course.lessons?.length ?? 0,
      course,
    });

    // Crear la entidad hija según el tipo.
    // cascade: true en Lesson hace que save() persista ambas filas.
    if (lessonData.type === 'class') {
      lesson.videoData = this.videoLessonRepository.create({
        videoUrl: lessonData.videoUrl,
        duration: lessonData.duration,
        isLive: lessonData.isLive ?? false,
      });
    } else if (lessonData.type === 'exam') {
      lesson.examData = this.examLessonRepository.create({
        passingScore: lessonData.passingScore,
      });
      // Las questions vienen en lessonData y se guardan por cascade del @OneToMany
      if (lessonData.questions) {
        lesson.questions = lessonData.questions;
      }
    }

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
   *
   * Actualiza campos base (title, description) directamente en la entidad Lesson.
   * Actualiza campos del hijo (videoUrl, passingScore, etc.) en la entidad hija
   * correspondiente (VideoLesson o ExamLesson).
   *
   * Para questions: estrategia "borrar todo y reinsertar".
   */
  async updateLesson(lessonId: string, data: Partial<Lesson> & Record<string, any>): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['videoData', 'examData'],
    });
    if (!lesson) {
      throw new NotFoundException(`Lesson with id ${lessonId} not found`);
    }

    // Actualizar campos base
    if (data.title !== undefined) lesson.title = data.title;
    if (data.description !== undefined) lesson.description = data.description;

    // Actualizar campos del hijo según el tipo
    if (lesson.videoData) {
      if (data.videoUrl !== undefined) lesson.videoData.videoUrl = data.videoUrl;
      if (data.duration !== undefined) lesson.videoData.duration = data.duration;
      if (data.isLive !== undefined) lesson.videoData.isLive = data.isLive;
    }

    if (lesson.examData) {
      if (data.passingScore !== undefined) lesson.examData.passingScore = data.passingScore;
    }

    // Reemplazo de preguntas (borrar viejas, insertar nuevas por cascade)
    if (data.questions) {
      await this.quizQuestionRepository.delete({ lesson: { id: lessonId } });
      lesson.questions = data.questions;
    }

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
   * ¿Alguna OTRA lección (distinta a excludeLessonId) usa este videoUrl?
   * Ahora consulta la tabla video_lessons donde vive videoUrl.
   */
  async isVideoUrlReferenced(
    videoUrl: string,
    excludeLessonId: string,
  ): Promise<boolean> {
    const count = await this.videoLessonRepository.count({
      where: {
        videoUrl,
        lessonId: Not(excludeLessonId),
      },
    });
    return count > 0;
  }

  /**
   * ¿Alguna lección (cualquiera) usa este videoUrl?
   */
  async isVideoUrlInUse(videoUrl: string): Promise<boolean> {
    const count = await this.videoLessonRepository.count({ where: { videoUrl } });
    return count > 0;
  }

  /**
   * ¿Algún curso (cualquiera) usa esta thumbnailUrl?
   *
   * Mismo principio: se llama después de borrar el curso de la DB,
   * así que no necesitamos exclusión.
   */
  async isThumbnailUrlInUse(thumbnailUrl: string): Promise<boolean> {
    const count = await this.courseRepository.count({
      where: { thumbnailUrl },
    });
    return count > 0;
  }

  /**
   * Carga una lección con sus preguntas y opciones.
   *
   * relations funciona como un "JOIN automático": le dice a TypeORM que además
   * de la lección, cargue las entidades relacionadas en una sola consulta.
   * 'questions' carga QuizQuestion[], y 'questions.options' carga QuizOption[]
   * dentro de cada pregunta. Sin esto, lesson.questions sería undefined.
   */
  async findLessonWithQuestions(lessonId: string): Promise<Lesson | null> {
    return this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['videoData', 'examData', 'questions', 'questions.options'],
      order: { questions: { order: 'ASC' } },
    });
  }
}
