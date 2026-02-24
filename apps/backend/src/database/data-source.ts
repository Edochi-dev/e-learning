import 'dotenv/config';
import { DataSource } from 'typeorm';
import { join } from 'path';

import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Lesson } from '../courses/entities/lessons.entity';

// Este DataSource es exclusivo para el CLI de TypeORM (migration:generate, migration:run, etc.)
// La configuración de runtime vive en app.module.ts
export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mn_db',
    entities: [User, Course, Lesson],
    migrations: [join(__dirname, 'migrations/*.ts')],
});
