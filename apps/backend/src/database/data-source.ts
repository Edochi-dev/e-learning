import 'dotenv/config';
import { DataSource } from 'typeorm';

import { User } from '../users/entities/user.entity';
import { PasswordResetToken } from '../users/entities/password-reset-token.entity';
import { Course } from '../courses/entities/course.entity';
import { Lesson } from '../courses/entities/lessons.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { LessonProgress } from '../progress/entities/lesson-progress.entity';
import { CertificateTemplate } from '../certificates/entities/certificate-template.entity';
import { Certificate } from '../certificates/entities/certificate.entity';
import { Order } from '../orders/entities/order.entity';
import { VideoLesson } from '../courses/entities/video-lesson.entity';
import { ExamLesson } from '../courses/entities/exam-lesson.entity';
import { AssignmentLesson } from '../courses/entities/assignment-lesson.entity';
import { QuizQuestion } from '../courses/entities/quiz-question.entity';
import { QuizOption } from '../courses/entities/quiz-option.entity';
import { QuizAttempt } from '../enrollments/entities/quiz-attempt.entity';
import { QuizAttemptAnswer } from '../enrollments/entities/quiz-attempt-answer.entity';
import { AssignmentSubmission } from '../corrections/entities/assignment-submission.entity';
import { NameChangeRequest } from '../name-change-requests/entities/name-change-request.entity';
import { ScheduleEvent } from '../schedule/entities/schedule-event.entity';

import { MIGRATIONS } from './migrations-registry';

// Este DataSource es exclusivo para el CLI de TypeORM (migration:generate, migration:run, etc.)
// La configuración de runtime vive en app.module.ts
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mn_db',
  entities: [
    User,
    PasswordResetToken,
    Course,
    Lesson,
    VideoLesson,
    ExamLesson,
    AssignmentLesson,
    Enrollment,
    LessonProgress,
    CertificateTemplate,
    Certificate,
    Order,
    QuizQuestion,
    QuizOption,
    QuizAttempt,
    QuizAttemptAnswer,
    AssignmentSubmission,
    NameChangeRequest,
    ScheduleEvent,
  ],
  migrations: MIGRATIONS,
});
