import { IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * QuizAnswerDto — Una respuesta individual: "para esta pregunta, elegí esta opción".
 *
 * El backend busca si selectedOptionId tiene isCorrect === true para evaluarla.
 */
export class QuizAnswerDto {
  @IsUUID()
  questionId: string;

  @IsUUID()
  selectedOptionId: string;
}

/**
 * SubmitQuizDto — Payload completo para enviar un quiz.
 *
 * courseId se necesita para el ownership check (verificar que el alumno
 * está matriculado antes de permitirle tomar el examen).
 */
export class SubmitQuizDto {
  @IsUUID()
  lessonId: string;

  @IsUUID()
  courseId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers: QuizAnswerDto[];
}
