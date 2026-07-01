import { config } from 'dotenv';
import { join } from 'path';

/**
 * Setup de los tests E2E — se ejecuta ANTES de que el spec importe AppModule.
 *
 * Carga apps/backend/.env.test en process.env para que buildTypeOrmOptions()
 * lea la conexión de la base EFÍMERA de test (puerto 5433, DB marisnails_e2e)
 * y NO la de desarrollo.
 *
 * `override: true` garantiza que estos valores ganan sobre cualquier variable
 * que ya estuviera en el entorno. Combinado con el guardarraíl de seguridad de
 * typeorm.config.ts, hace imposible que los tests toquen dev o producción.
 */
config({ path: join(__dirname, '..', '.env.test'), override: true });
process.env.NODE_ENV = 'test';
