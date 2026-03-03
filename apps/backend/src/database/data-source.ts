import 'dotenv/config';
import { DataSource } from 'typeorm';

import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Lesson } from '../courses/entities/lessons.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { LessonProgress } from '../enrollments/entities/lesson-progress.entity';

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

// Este DataSource es exclusivo para el CLI de TypeORM (migration:generate, migration:run, etc.)
// La configuración de runtime vive en app.module.ts
export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mn_db',
    entities: [User, Course, Lesson, Enrollment, LessonProgress],
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
    ],
});
