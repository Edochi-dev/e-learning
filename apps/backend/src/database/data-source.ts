import 'dotenv/config';
import { DataSource } from 'typeorm';

import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Lesson } from '../courses/entities/lessons.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { LessonProgress } from '../enrollments/entities/lesson-progress.entity';
import { CertificateTemplate } from '../certificates/entities/certificate-template.entity';
import { Certificate } from '../certificates/entities/certificate.entity';
import { Order } from '../orders/entities/order.entity';

import { InitialSchema1740000000000 } from './migrations/1740000000000-InitialSchema';
import { Migration1771952849166 } from './migrations/1771952849166-Migration';
import { AddLessonOrder1771952849167 } from './migrations/1771952849167-AddLessonOrder';
import { MoveLessonIsLive1771952849168 } from './migrations/1771952849168-MoveLessonIsLive';
import { Migration1772140261227 } from './migrations/1772140261227-Migration';
import { Migration1772164663311 } from './migrations/1772164663311-Migration';
import { AddEnrollmentsAndProgress1772200000000 } from './migrations/1772200000000-AddEnrollmentsAndProgress';
import { Migration1772577517212 } from './migrations/1772577517212-Migration';
import { AddFkIndexes1772577517213 } from './migrations/1772577517213-AddFkIndexes';
import { Migration1772578665651 } from './migrations/1772578665651-Migration';
import { Migration1772652147495 } from './migrations/1772652147495-Migration';
import { Migration1772656342794 } from './migrations/1772656342794-Migration';
import { Migration1772660199311 } from './migrations/1772660199311-Migration';
import { Migration1773239467816 } from './migrations/1773239467816-Migration';
import { Migration1773240510997 } from './migrations/1773240510997-Migration';
import { Migration1773241694350 } from './migrations/1773241694350-Migration';
import { Migration1773243621356 } from './migrations/1773243621356-Migration';
import { MakeLessonDurationNullable1773500000000 } from './migrations/1773500000000-MakeLessonDurationNullable';
import { AddCourseFeatures1773500100000 } from './migrations/1773500100000-AddCourseFeatures';
import { Migration1774043566376 } from './migrations/1774043566376-Migration';
import { Migration1774364896058 } from './migrations/1774364896058-Migration';

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
    Course,
    Lesson,
    Enrollment,
    LessonProgress,
    CertificateTemplate,
    Certificate,
    Order,
  ],
  migrations: [
    InitialSchema1740000000000,
    Migration1771952849166,
    AddLessonOrder1771952849167,
    MoveLessonIsLive1771952849168,
    Migration1772140261227,
    Migration1772164663311,
    AddEnrollmentsAndProgress1772200000000,
    Migration1772577517212,
    AddFkIndexes1772577517213,
    Migration1772578665651,
    Migration1772652147495,
    Migration1772656342794,
    Migration1772660199311,
    Migration1773239467816,
    Migration1773240510997,
    Migration1773241694350,
    Migration1773243621356,
    MakeLessonDurationNullable1773500000000,
    AddCourseFeatures1773500100000,
    Migration1774043566376,
    Migration1774364896058,
  ],
});
