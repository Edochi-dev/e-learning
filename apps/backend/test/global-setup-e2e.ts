import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { MIGRATIONS } from '../src/database/migrations-registry';

/**
 * globalSetup de los tests E2E — se ejecuta UNA vez, antes de todos los specs.
 *
 * Deja la base de datos de test con un esquema limpio (DROP SCHEMA public) para
 * que cada corrida completa parta de cero. Después, al arrancar la app en el
 * spec, `migrationsRun: true` reconstruye el esquema aplicando las migraciones
 * reales.
 *
 * ¿Por qué limpiar aquí por SQL y no con `dropSchema` de TypeORM?
 * Porque `dropSchema` obliga a TypeORM a derivar el DDL desde las entidades, y
 * el esquema de herencia de lecciones no es compatible con esa derivación.
 * Un DROP SCHEMA por SQL crudo es agnóstico a las entidades y siempre funciona.
 *
 * GUARDARRAÍL: este archivo ejecuta una operación DESTRUCTIVA (DROP SCHEMA).
 * Antes de tocar nada, verifica que la conexión sea local y su base contenga
 * "test"/"e2e". Si no, aborta. Así jamás puede borrar dev ni producción.
 */
export default async function globalSetup(): Promise<void> {
  config({ path: join(__dirname, '..', '.env.test'), override: true });

  const host = process.env.DB_HOST;
  const database = process.env.DB_NAME;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';
  const looksLikeTestDb = /(test|e2e)/i.test(database ?? '');

  if (!isLocalHost || !looksLikeTestDb) {
    throw new Error(
      `[SEGURIDAD] global-setup-e2e ABORTADO: la base "${database ?? '(sin nombre)'}"` +
        `@"${host ?? '(sin host)'}" no parece de test. No se ejecutará DROP SCHEMA.`,
    );
  }

  // DataSource SIN entidades (solo migraciones): así no dispara la validación
  // de metadatos de TypeORM; solo lo usamos para provisionar el esquema.
  const dataSource = new DataSource({
    type: 'postgres',
    host,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database,
    migrations: MIGRATIONS,
  });

  await dataSource.initialize();
  try {
    // 1. Esquema limpio.
    await dataSource.query(
      'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;',
    );

    // 2. Extensión uuid-ossp: dev/producción la tienen instalada (provee
    //    uuid_generate_v4(), que varias migraciones usan como DEFAULT). Al no
    //    crearla ninguna migración, hay que instalarla aquí en la DB fresca.
    await dataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // 3. Aplicar las MISMAS migraciones que producción → esquema idéntico.
    await dataSource.runMigrations();

    // 4. Parche de un bug latente: InitialSchema crea "users.id" como
    //    uuid NOT NULL SIN DEFAULT (con CREATE TABLE IF NOT EXISTS, que en dev
    //    fue no-op porque la tabla ya existía de un synchronize previo con
    //    default). En una DB fresca la columna queda sin default y no se pueden
    //    insertar usuarios. Le damos el default que la migración omitió.
    await dataSource.query(
      'ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();',
    );
  } finally {
    await dataSource.destroy();
  }
}
