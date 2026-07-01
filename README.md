# Maris Nails Academy — Plataforma E-Learning

Monorepo de una plataforma de cursos online (e-learning) para una academia de uñas:
catálogo de cursos, lecciones en video, quizzes, correcciones de tareas, matrículas,
seguimiento de progreso, pagos con aprobación manual y emisión de certificados PDF con QR.

- **Producción:** [marisnails.academy](https://marisnails.academy)
- **Stack:** NestJS 11 · React 19 + Vite · PostgreSQL 16 · TypeORM · TypeScript

---

## Arquitectura

El proyecto sigue **Clean Architecture (hexagonal)** de forma estricta. La dirección de
las dependencias **siempre apunta hacia adentro**:

```
HTTP Request → Controller → UseCase → Gateway (abstracto) ← Repository (TypeORM)
```

Los *gateways* son **clases abstractas** (no interfaces) porque la inyección de
dependencias de NestJS necesita un token en runtime. Cada módulo enlaza la abstracción
con su implementación concreta (`{ provide: CourseGateway, useClass: CoursesRepository }`).
Para cambiar de almacenamiento local a S3, por ejemplo, basta implementar un nuevo gateway
y cambiar el binding del módulo — los casos de uso no se tocan.

Documentación detallada de arquitectura y convenciones en [`CLAUDE.md`](./CLAUDE.md).

### Estructura del monorepo

```
apps/backend/     API REST en NestJS 11 (Clean Architecture)
apps/frontend/    SPA en React 19 + Vite
packages/shared/  Interfaces y enums de dominio compartidos (@maris-nails/shared)
```

### Módulos del backend

| Módulo | Responsabilidad |
|---|---|
| `users` | Autenticación JWT, registro/login, rate limiting en endpoints de auth |
| `courses` | CRUD de cursos y lecciones, paginación, quizzes |
| `enrollments` | Matrículas de alumnos en cursos |
| `progress` | Progreso de lecciones (`LessonProgress`) y de visionado (`WatchProgress`) |
| `corrections` | Entregas de tareas tipo corrección con flujo de revisión |
| `videos` | Streaming de video con URLs firmadas de corta duración |
| `storage` | Almacenamiento de archivos, limpieza de huérfanos, procesado de imágenes |
| `notifications` | Envío de emails (SMTP real o fallback a consola) |
| `orders` | Pedidos con aprobación de pago manual |
| `certificates` | Generación de certificados PDF con QR personalizado |

---

## Requisitos previos

- **Node.js** 20+ y **npm** 10+
- **Docker** y **Docker Compose** (para PostgreSQL)

---

## Puesta en marcha (desarrollo)

```bash
# 1. Instalar dependencias de todos los workspaces
npm install

# 2. Configurar variables de entorno
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
# Edita ambos .env con tus valores (DB, JWT_SECRET de 32+ chars, etc.)

# 3. Levantar PostgreSQL 16 (puerto 5432)
docker-compose up -d db

# 4. Arrancar el backend (puerto 3000) — aplica migraciones al arrancar
cd apps/backend && npm run start:dev

# 5. En otra terminal, arrancar el frontend (puerto 5173)
cd apps/frontend && npm run dev
```

Ambos servidores deben correr simultáneamente. El frontend consume la API en la URL
definida por `VITE_API_URL`.

---

## Comandos útiles

Todos desde la **raíz del monorepo** salvo que se indique lo contrario.

**Backend** (`apps/backend/`):

```bash
npm run start:dev          # Servidor con watch (puerto 3000)
npm run build              # Compila TypeScript → dist/
npm run test               # Tests unitarios (Jest)
npm run test:e2e           # Tests de integración (supertest)
npm run migration:generate # Diff de entidades vs DB → nueva migración
npm run migration:run      # Aplica migraciones pendientes
npm run migration:revert   # Revierte la última migración
```

**Frontend** (`apps/frontend/`):

```bash
npm run dev                # Servidor de desarrollo Vite (puerto 5173)
npm run build              # Build de producción
npm run test               # Tests con Vitest
```

> ⚠️ **Lint:** no ejecutes `npm run lint` a ciegas — corre ESLint con `--fix` sobre todo
> el workspace y ensucia archivos fuera de tu cambio. Valida solo lo que tocaste con
> `npx eslint <ruta/al/archivo>`. Ver detalles en `CLAUDE.md`.

---

## Tests

- **Backend unitarios:** `cd apps/backend && npm run test`
- **Backend E2E (supertest):** `cd apps/backend && npm run test:e2e`
- **Frontend (Vitest):** `cd apps/frontend && npm run test`

---

## Migraciones de base de datos

`synchronize` está en **`false`**: los cambios de esquema requieren migraciones explícitas.
`migrationsRun: true` en `app.module.ts` aplica las migraciones pendientes al arrancar el
backend. Tras modificar una entidad:

```bash
cd apps/backend
npm run migration:generate   # revisa el archivo generado
npm run migration:run
```

---

## Despliegue

El despliegue usa Docker Compose + Nginx con backup automático de la base de datos.

```bash
./deploy.sh   # crea un backup .sql, hace build y levanta los contenedores
```

- `docker-compose.yml` — servicios `db` (PostgreSQL) y `backend` (NestJS).
- `nginx.conf` — proxy reverso + servido de los estáticos del frontend.
- `deploy.sh` — respalda la DB antes de cada deploy (restaurable desde `backups/`).
- Los certificados SSL viven en `ssl/` y **nunca** se suben a git.

---

## Variables de entorno

Plantillas documentadas en [`apps/backend/.env.example`](./apps/backend/.env.example) y
[`apps/frontend/.env.example`](./apps/frontend/.env.example). Los `.env` reales están en
`.gitignore` y no deben subirse jamás.
