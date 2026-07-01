import { join } from 'path';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

import { User } from '../users/entities/user.entity';
import { MIGRATIONS } from './migrations-registry';

/**
 * buildTypeOrmOptions — Construye la configuración de TypeORM según el entorno.
 *
 * ¿Por qué un factory en vez de un objeto inline en app.module?
 * Porque la config de la base de datos NO es la misma en producción que en
 * los tests E2E, y meter esa bifurcación con condicionales sueltos dentro del
 * @Module ensuciaría el módulo. Extraer la decisión a una función nombrada
 * mantiene app.module declarativo y deja la lógica de entorno en un solo sitio.
 *
 * COMPORTAMIENTO POR ENTORNO
 *   - Producción / desarrollo (NODE_ENV !== 'test'):
 *       synchronize: false  → el esquema NUNCA se toca automáticamente.
 *       migrationsRun: true → se aplican las migraciones versionadas al arrancar.
 *     (idéntico al comportamiento histórico del proyecto.)
 *   - Test E2E (NODE_ENV === 'test'):
 *       dropSchema + migrationsRun → borra el esquema y lo reconstruye
 *       aplicando LAS MISMAS migraciones que producción. Así el esquema de
 *       test es idéntico al real (no una aproximación de `synchronize`, que
 *       ni siquiera soporta la herencia de tablas de las lecciones).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  GUARDARRAÍL DE SEGURIDAD (crítico)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Los tests resetean la base (test/global-setup-e2e.ts hace DROP SCHEMA), lo
 *  cual es DESTRUCTIVO. Si por un error de configuración el modo test apuntara
 *  a la base de desarrollo o a producción, perderíamos datos reales.
 *
 *  Por eso, en modo test, esta función se NIEGA a arrancar (lanza excepción)
 *  salvo que la conexión apunte inequívocamente a una base LOCAL y cuyo nombre
 *  contenga `test`/`e2e`. La base de dev (`marisnails_db`) y la de prod (host
 *  remoto) no cumplen esa condición, así que quedan protegidas por diseño.
 */
export function buildTypeOrmOptions(): TypeOrmModuleOptions {
  const isTest = process.env.NODE_ENV === 'test';

  const host = process.env.DB_HOST;
  const database = process.env.DB_NAME;

  if (isTest) {
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    const looksLikeTestDb = /(test|e2e)/i.test(database ?? '');

    if (!isLocalHost || !looksLikeTestDb) {
      throw new Error(
        `[SEGURIDAD] Arranque en modo test ABORTADO. La conexión apunta a ` +
          `"${database ?? '(sin nombre)'}"@"${host ?? '(sin host)'}", que no ` +
          `parece una base de datos de test local y desechable. ` +
          `dropSchema es destructivo y NO se ejecutará contra una base que no ` +
          `sea de test. Revisa apps/backend/.env.test.`,
      );
    }
  }

  return {
    type: 'postgres',
    host,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database,
    autoLoadEntities: true,
    entities: [User],
    // El esquema NUNCA se sincroniza ni se dropea desde las entidades: en TODOS
    // los entornos la fuente de verdad son las migraciones versionadas. (El
    // reseteo de la base de test lo hace test/global-setup-e2e.ts por SQL,
    // fuera de TypeORM, para no depender del schema-builder por entidades.)
    synchronize: false,
    dropSchema: false,
    // En test el esquema ya lo provisiona test/global-setup-e2e.ts (corre las
    // migraciones antes de arrancar la app), así que aquí NO re-migramos. En
    // dev/prod aplicamos el glob de los .js ya compilados al arrancar.
    migrations: isTest ? MIGRATIONS : [join(__dirname, 'migrations/*.js')],
    migrationsRun: !isTest,
  };
}
