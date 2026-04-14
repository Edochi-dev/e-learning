import React, { useState, useEffect, useCallback } from 'react';
import type { QuizQuestion, QuizAnswer, QuizResult } from '@maris-nails/shared';
import type { CourseGateway } from '../gateways/CourseGateway';
import type { EnrollmentGateway } from '../gateways/EnrollmentGateway';

/**
 * QuizPlayer — Interfaz del alumno para tomar un examen.
 *
 * Ciclo de vida del componente:
 * 1. Al montar → carga las preguntas del backend (GET /courses/:courseId/lessons/:lessonId/quiz)
 *    Las preguntas vienen SIN el campo `isCorrect` en las opciones — el backend lo omite
 *    por seguridad para que el alumno no pueda ver las respuestas en DevTools.
 *
 * 2. El alumno selecciona una opción por pregunta (radio buttons).
 *
 * 3. Al enviar → POST /enrollments/me/quiz con sus respuestas.
 *    El backend evalúa, guarda el intento (QuizAttempt) y devuelve el resultado.
 *
 * 4. Pantalla de resultados:
 *    - Aciertos en verde con checkmark
 *    - Fallos en rojo, SIN revelar la respuesta correcta, con hint "Repasa: [lección]"
 *    - Si aprobó: callback onComplete para que CourseLearnPage marque la lección
 *    - Si reprobó: mensaje con countdown de 30 min antes de reintentar
 *
 * Props:
 * - courseId, lessonId: identifican el examen
 * - courseGateway: para cargar las preguntas
 * - enrollmentGateway: para enviar las respuestas
 * - onComplete: callback cuando el alumno aprueba (CourseLearnPage marca la lección completa)
 * - onNavigateToLesson: opcional, para que el hint "Repasa lección X" sea clickeable
 */

interface QuizPlayerProps {
    courseId: string;
    lessonId: string;
    courseGateway: CourseGateway;
    enrollmentGateway: EnrollmentGateway;
    onComplete: () => void;
    onNavigateToLesson?: (lessonId: string) => void;
}

const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutos — debe coincidir con el backend

export const QuizPlayer: React.FC<QuizPlayerProps> = ({
    courseId,
    lessonId,
    courseGateway,
    enrollmentGateway,
    onComplete,
    onNavigateToLesson,
}) => {
    // ── Estado del quiz ───────────────────────────────────────────────
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Respuestas del alumno: { questionId → selectedOptionId }
    const [answers, setAnswers] = useState<Record<string, string>>({});

    // Índice de la pregunta actual — el quiz ahora se muestra pregunta por
    // pregunta (estilo review de correcciones del admin) en vez de un scroll
    // con todas visibles. Esto evita scroll infinito en quizzes largos y
    // mejora enfoque: una pregunta, una decisión, avanza.
    const [currentIndex, setCurrentIndex] = useState(0);

    // Estado de envío y resultado
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<QuizResult | null>(null);

    // Cooldown: milisegundos restantes antes de poder reintentar
    const [cooldownRemaining, setCooldownRemaining] = useState(0);

    // ── Cargar preguntas + último intento ─────────────────────────────
    // Al montar cargamos en paralelo:
    //  - Las preguntas del quiz (para poder re-renderizar el detalle si
    //    hay un intento previo).
    //  - El último intento del alumno (para decidir si mostrar formulario
    //    o pantalla de resultados).
    //
    // Si hay intento aprobado → quedamos en pantalla de resultados PERMANENTE.
    // Si hay intento reprobado y cooldown > 0 → pantalla de resultados con countdown.
    // Si no hay intento previo o cooldown expiró → formulario vacío.
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            setResult(null);
            setAnswers({});
            setCurrentIndex(0);
            setCooldownRemaining(0);

            try {
                const [questionsData, lastAttempt] = await Promise.all([
                    courseGateway.getQuizQuestions(courseId, lessonId),
                    enrollmentGateway.getLastQuizAttempt(lessonId, courseId),
                ]);
                if (cancelled) return;

                setQuestions(questionsData);

                // lastAttempt siempre viene como objeto; `result: null`
                // indica que no hay intentos previos (mostramos formulario).
                if (lastAttempt.result) {
                    setResult(lastAttempt.result);
                    setCooldownRemaining(lastAttempt.cooldownRemainingMs);
                }
            } catch (err: any) {
                if (!cancelled) setError(err.message || 'Error al cargar el examen');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [courseId, lessonId, courseGateway, enrollmentGateway]);

    // ── Countdown timer para cooldown ─────────────────────────────────
    // Se activa cuando cooldownRemaining > 0 (tras reprobar o recibir 429).
    // Cada segundo resta 1000ms. Cuando llega a 0, el alumno puede reintentar.
    useEffect(() => {
        if (cooldownRemaining <= 0) return;

        const timer = setInterval(() => {
            setCooldownRemaining(prev => {
                const next = prev - 1000;
                return next <= 0 ? 0 : next;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [cooldownRemaining > 0]); // Solo re-suscribir cuando pasa de 0 ↔ >0

    // ── Handlers ──────────────────────────────────────────────────────

    const handleSelectOption = useCallback((questionId: string, optionId: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    }, []);

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);

        // Convertir el map de respuestas al formato que espera el backend
        const quizAnswers: QuizAnswer[] = questions.map(q => ({
            questionId: q.id,
            selectedOptionId: answers[q.id],
        }));

        try {
            const quizResult = await enrollmentGateway.submitQuiz(lessonId, courseId, quizAnswers);
            setResult(quizResult);

            if (quizResult.passed) {
                onComplete();
            } else {
                // Si reprobó, activar cooldown de 30 minutos
                setCooldownRemaining(COOLDOWN_MS);
            }
        } catch (err: any) {
            // Si el backend responde 429 (cooldown), extraemos el tiempo restante del mensaje
            if (err.message?.includes('minutos')) {
                // Intentar extraer los minutos del mensaje del backend
                const minuteMatch = err.message.match(/(\d+)\s*minutos?/);
                if (minuteMatch) {
                    setCooldownRemaining(parseInt(minuteMatch[1]) * 60 * 1000);
                } else {
                    setCooldownRemaining(COOLDOWN_MS);
                }
            }
            setError(err.message || 'Error al enviar el examen');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRetry = () => {
        setResult(null);
        setAnswers({});
        setCurrentIndex(0);
        setError(null);
    };

    // ── Helpers de formato ────────────────────────────────────────────

    const formatCooldown = (ms: number): string => {
        const totalSeconds = Math.ceil(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const allAnswered = questions.length > 0 && questions.every(q => answers[q.id]);

    // ── Render: Loading ───────────────────────────────────────────────

    if (loading) {
        return (
            <div className="quiz-player quiz-player--loading">
                <div className="spinner" />
                <p>Cargando examen...</p>
            </div>
        );
    }

    if (error && !result) {
        return (
            <div className="quiz-player quiz-player--error">
                <p>{error}</p>
                {cooldownRemaining > 0 && (
                    <div className="quiz-player__cooldown">
                        Puedes reintentar en <strong>{formatCooldown(cooldownRemaining)}</strong>
                    </div>
                )}
            </div>
        );
    }

    // ── Render: Resultados ────────────────────────────────────────────

    if (result) {
        return (
            <div className={`quiz-player quiz-result ${result.passed ? 'quiz-result--passed' : 'quiz-result--failed'}`}>
                <div className="quiz-result__header">
                    <h2>{result.passed ? 'Aprobaste' : 'No aprobaste'}</h2>
                    <div className="quiz-result__score">
                        {result.score} de {result.totalQuestions} correctas
                        <span className="quiz-result__minimum">
                            (mínimo: {result.passingScore})
                        </span>
                    </div>
                </div>

                <div className="quiz-result__details">
                    {questions.map((q, qIndex) => {
                        const detail = result.details.find(d => d.questionId === q.id);
                        if (!detail) return null;

                        const selectedOption = q.options.find(o => o.id === detail.selectedOptionId);

                        return (
                            <div
                                key={q.id}
                                className={`quiz-result__question ${detail.correct ? 'quiz-result__question--correct' : 'quiz-result__question--wrong'}`}
                            >
                                <div className="quiz-result__question-header">
                                    <span className="quiz-result__question-icon">
                                        {detail.correct ? '✓' : '✗'}
                                    </span>
                                    <span className="quiz-result__question-text">
                                        {qIndex + 1}. {q.text}
                                    </span>
                                </div>

                                <div className="quiz-result__answer">
                                    Tu respuesta: {selectedOption?.text ?? '—'}
                                </div>

                                {/* Hint para preguntas incorrectas — no revela la respuesta correcta */}
                                {!detail.correct && detail.relatedLessonTitle && (
                                    <div className="quiz-hint">
                                        {onNavigateToLesson && detail.relatedLessonId ? (
                                            <button
                                                type="button"
                                                className="quiz-hint__link"
                                                onClick={() => onNavigateToLesson(detail.relatedLessonId!)}
                                            >
                                                Repasa: {detail.relatedLessonTitle}
                                            </button>
                                        ) : (
                                            <span>Repasa: {detail.relatedLessonTitle}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Acciones post-resultado */}
                <div className="quiz-result__actions">
                    {result.passed ? (
                        <p className="quiz-result__success-message">
                            La lección ha sido marcada como completada.
                        </p>
                    ) : (
                        <>
                            {cooldownRemaining > 0 ? (
                                <div className="quiz-player__cooldown">
                                    Puedes reintentar en <strong>{formatCooldown(cooldownRemaining)}</strong>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={handleRetry}
                                >
                                    Reintentar examen
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }

    // ── Render: Formulario de preguntas (una a una) ───────────────────
    //
    // El quiz se muestra pregunta por pregunta con una barra de progreso
    // arriba y botones Anterior/Siguiente abajo. Para avanzar hay que
    // responder la actual (forzamos selección en vez de permitir skip —
    // así la alumna nunca llega al final con preguntas sin responder).
    // La última pregunta intercambia "Siguiente" por "Enviar respuestas".
    // Puede volver atrás con "Anterior" para cambiar cualquier respuesta.

    const currentQuestion = questions[currentIndex];
    const isLastQuestion = currentIndex === questions.length - 1;
    const currentAnswered = currentQuestion && !!answers[currentQuestion.id];
    const answeredCount = Object.keys(answers).length;
    const progressPct = ((currentIndex + 1) / questions.length) * 100;

    return (
        <div className="quiz-player">
            <div className="quiz-player__header">
                <div className="quiz-player__heading">
                    <h2>Examen</h2>
                    <span className="quiz-player__count">
                        Pregunta {currentIndex + 1} de {questions.length}
                    </span>
                </div>
                <span className="quiz-player__answered-count" aria-live="polite">
                    {answeredCount} / {questions.length} respondidas
                </span>
            </div>

            {/* Barra de progreso lineal — refleja qué tan avanzada está la
                alumna en el quiz. Independiente del número de respuestas
                correctas: esto es puro "¿dónde voy?". */}
            <div
                className="quiz-player__progress"
                role="progressbar"
                aria-valuenow={currentIndex + 1}
                aria-valuemin={1}
                aria-valuemax={questions.length}
                aria-label="Progreso del examen"
            >
                <div
                    className="quiz-player__progress-fill"
                    style={{ width: `${progressPct}%` }}
                />
            </div>

            {currentQuestion && (
                <div key={currentQuestion.id} className="quiz-question quiz-question--single">
                    <p className="quiz-question__text">
                        {currentQuestion.text}
                    </p>
                    <div className="quiz-question__options">
                        {currentQuestion.options.map(opt => (
                            <label
                                key={opt.id}
                                className={`quiz-option ${answers[currentQuestion.id] === opt.id ? 'quiz-option--selected' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name={`quiz-${currentQuestion.id}`}
                                    value={opt.id}
                                    checked={answers[currentQuestion.id] === opt.id}
                                    onChange={() => handleSelectOption(currentQuestion.id, opt.id)}
                                />
                                <span className="quiz-option__text">{opt.text}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <div className="quiz-player__nav">
                <button
                    type="button"
                    className="btn-secondary quiz-player__nav-btn"
                    onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                    disabled={currentIndex === 0}
                >
                    ← Anterior
                </button>

                {isLastQuestion ? (
                    <button
                        type="button"
                        className="btn-primary quiz-player__nav-btn"
                        onClick={handleSubmit}
                        disabled={!allAnswered || submitting}
                    >
                        {submitting ? 'Enviando...' : 'Enviar respuestas'}
                    </button>
                ) : (
                    <button
                        type="button"
                        className="btn-primary quiz-player__nav-btn"
                        onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
                        disabled={!currentAnswered}
                    >
                        Siguiente →
                    </button>
                )}
            </div>
        </div>
    );
};
