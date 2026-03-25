import React from 'react';
import type { Lesson, CreateQuizQuestionPayload, CreateQuizOptionPayload } from '@maris-nails/shared';

/**
 * QuizQuestionBuilder — Editor visual de preguntas para el admin.
 *
 * Permite al admin crear/editar las preguntas de un examen:
 * - Agregar/eliminar preguntas
 * - Cada pregunta tiene: texto, lección relacionada (dropdown), opciones
 * - Cada opción tiene: texto + radio para marcar como correcta
 * - Validación visual: mínimo 2 opciones, exactamente 1 correcta por pregunta
 *
 * Es un componente "controlado": recibe questions + onChange del padre.
 * No tiene estado propio — el estado vive en EditCoursePage.
 */

interface QuizQuestionBuilderProps {
    questions: CreateQuizQuestionPayload[];
    onChange: (questions: CreateQuizQuestionPayload[]) => void;
    /** Lecciones tipo 'class' del curso, para el dropdown de "lección relacionada" */
    classLessons: Lesson[];
}

export const QuizQuestionBuilder: React.FC<QuizQuestionBuilderProps> = ({
    questions,
    onChange,
    classLessons,
}) => {

    // ── Helpers para preguntas ────────────────────────────────────────

    const addQuestion = () => {
        onChange([
            ...questions,
            {
                text: '',
                relatedLessonId: undefined,
                options: [
                    { text: '', isCorrect: true },
                    { text: '', isCorrect: false },
                ],
            },
        ]);
    };

    const removeQuestion = (qIndex: number) => {
        onChange(questions.filter((_, i) => i !== qIndex));
    };

    const updateQuestionText = (qIndex: number, text: string) => {
        const updated = [...questions];
        updated[qIndex] = { ...updated[qIndex], text };
        onChange(updated);
    };

    const updateRelatedLesson = (qIndex: number, lessonId: string) => {
        const updated = [...questions];
        updated[qIndex] = {
            ...updated[qIndex],
            relatedLessonId: lessonId || undefined,
        };
        onChange(updated);
    };

    // ── Helpers para opciones ─────────────────────────────────────────

    const addOption = (qIndex: number) => {
        const updated = [...questions];
        updated[qIndex] = {
            ...updated[qIndex],
            options: [...updated[qIndex].options, { text: '', isCorrect: false }],
        };
        onChange(updated);
    };

    const removeOption = (qIndex: number, oIndex: number) => {
        const updated = [...questions];
        updated[qIndex] = {
            ...updated[qIndex],
            options: updated[qIndex].options.filter((_, i) => i !== oIndex),
        };
        onChange(updated);
    };

    const updateOptionText = (qIndex: number, oIndex: number, text: string) => {
        const updated = [...questions];
        const opts = [...updated[qIndex].options];
        opts[oIndex] = { ...opts[oIndex], text };
        updated[qIndex] = { ...updated[qIndex], options: opts };
        onChange(updated);
    };

    // Cuando el admin selecciona una opción como correcta, desmarcamos las demás.
    // Radio button behavior: solo 1 correcta por pregunta.
    const setCorrectOption = (qIndex: number, oIndex: number) => {
        const updated = [...questions];
        const opts = updated[qIndex].options.map((o, i) => ({
            ...o,
            isCorrect: i === oIndex,
        }));
        updated[qIndex] = { ...updated[qIndex], options: opts };
        onChange(updated);
    };

    return (
        <div className="quiz-builder">
            {questions.map((q, qIndex) => (
                <div key={qIndex} className="quiz-builder__question">
                    <div className="quiz-builder__question-header">
                        <span className="quiz-builder__question-number">Pregunta {qIndex + 1}</span>
                        <button
                            type="button"
                            onClick={() => removeQuestion(qIndex)}
                            className="quiz-builder__remove-btn"
                        >
                            Eliminar
                        </button>
                    </div>

                    <input
                        type="text"
                        value={q.text}
                        onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                        placeholder="Escribe la pregunta..."
                        className="quiz-builder__question-input"
                        required
                    />

                    {/* Selector de lección relacionada */}
                    <div className="quiz-builder__related-lesson">
                        <label>Lección relacionada (hint si falla):</label>
                        <select
                            value={q.relatedLessonId ?? ''}
                            onChange={(e) => updateRelatedLesson(qIndex, e.target.value)}
                        >
                            <option value="">— Ninguna —</option>
                            {classLessons.map((lesson) => (
                                <option key={lesson.id} value={lesson.id}>
                                    {lesson.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Opciones de respuesta */}
                    <div className="quiz-builder__options">
                        {q.options.map((opt, oIndex) => (
                            <div key={oIndex} className="quiz-builder__option">
                                <input
                                    type="radio"
                                    name={`correct-${qIndex}`}
                                    checked={opt.isCorrect}
                                    onChange={() => setCorrectOption(qIndex, oIndex)}
                                    title="Marcar como correcta"
                                />
                                <input
                                    type="text"
                                    value={opt.text}
                                    onChange={(e) => updateOptionText(qIndex, oIndex, e.target.value)}
                                    placeholder={`Opción ${oIndex + 1}`}
                                    className="quiz-builder__option-input"
                                    required
                                />
                                {q.options.length > 2 && (
                                    <button
                                        type="button"
                                        onClick={() => removeOption(qIndex, oIndex)}
                                        className="quiz-builder__remove-option"
                                        title="Quitar opción"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => addOption(qIndex)}
                            className="quiz-builder__add-option"
                        >
                            + Agregar opción
                        </button>
                    </div>
                </div>
            ))}

            <button
                type="button"
                onClick={addQuestion}
                className="quiz-builder__add-question"
            >
                + Agregar pregunta
            </button>
        </div>
    );
};
