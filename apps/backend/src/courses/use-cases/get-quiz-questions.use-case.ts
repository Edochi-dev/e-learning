import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseGateway } from '../gateways/course.gateway';

/**
 * GetQuizQuestionsUseCase — Devuelve las preguntas de un quiz al alumno.
 *
 * ¿Por qué un Use Case y no devolver las preguntas directamente desde findOne?
 *
 * Porque este Use Case tiene una responsabilidad CRÍTICA de seguridad:
 * ELIMINAR `isCorrect` de las opciones antes de enviarlas al alumno.
 *
 * Si devolviéramos las preguntas tal cual vienen de la DB, el alumno podría
 * abrir el Network tab del navegador y ver cuál es la respuesta correcta.
 *
 * El mapeo (líneas de abajo) crea objetos NUEVOS sin la propiedad isCorrect.
 * Es como fotocopiar un examen pero tapando las respuestas antes de imprimirlo.
 *
 * También incluimos el relatedLessonId para que el frontend pueda mostrar
 * el hint "Repasa la lección X" después de evaluar, pero el título de la lección
 * relacionada se resuelve en el SubmitQuizUseCase (donde tenemos contexto del curso).
 */
@Injectable()
export class GetQuizQuestionsUseCase {
  constructor(private readonly courseGateway: CourseGateway) {}

  async execute(lessonId: string) {
    const lesson = await this.courseGateway.findLessonWithQuestions(lessonId);

    if (!lesson) {
      throw new NotFoundException('Lección no encontrada');
    }

    if (lesson.type !== 'exam') {
      throw new NotFoundException('Esta lección no es un examen');
    }

    // Mapear para OMITIR isCorrect — nunca revelar la respuesta al alumno
    return (lesson.questions ?? []).map((q) => ({
      id: q.id,
      text: q.text,
      order: q.order,
      relatedLessonId: q.relatedLessonId,
      options: (q.options ?? []).map((o) => ({
        id: o.id,
        text: o.text,
        // isCorrect NO se incluye aquí — esa es la clave de seguridad
      })),
    }));
  }
}
