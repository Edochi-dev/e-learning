# Maris Nails Academy — E-Learning Platform

Monorepo for an online course platform built for a nail-art academy: course catalog, video
lessons, quizzes, assignment corrections, enrollments, progress tracking, manually approved
payments, and PDF certificate issuance with QR verification.

- **Production:** [marisnails.academy](https://marisnails.academy)
- **Stack:** NestJS 11 · React 19 + Vite · PostgreSQL 16 · TypeORM · TypeScript

---

## Project status

Under **active development**. The core platform — auth, courses, lessons, enrollments,
progress, corrections, certificates, orders and scheduling — is implemented and deployed.

The public site currently runs in **"coming soon" mode**: a route guard shows a placeholder
page to everyone except authenticated `ADMIN` users, so the team can review the real pages
in production before opening to the public.

Known pending work: online payment integration (orders currently use manual approval) and
production SMTP credentials (email falls back to console logging when unconfigured).

---

## Architecture

The project follows **Clean Architecture (hexagonal)** strictly. Dependencies **always point
inward**:

```
HTTP Request → Controller → UseCase → Gateway (abstract) ← Repository (TypeORM)
```

Gateways are **abstract classes**, not interfaces, because NestJS dependency injection needs
a token that exists at runtime — TypeScript interfaces are erased at compile time. Each
module binds the abstraction to its implementation
(`{ provide: CourseGateway, useClass: CoursesRepository }`). Switching from local file
storage to S3, for example, means writing a new gateway implementation and changing one
binding — the use cases are untouched.

Detailed architecture notes and repository conventions live in [`CLAUDE.md`](./CLAUDE.md).

### Monorepo structure

```
apps/backend/     NestJS 11 REST API (Clean Architecture)
apps/frontend/    React 19 + Vite SPA
packages/shared/  Shared domain interfaces and enums (@maris-nails/shared)
```

### Backend modules

| Module | Responsibility |
|---|---|
| `users` | JWT authentication, registration/login, password reset, rate-limited auth endpoints |
| `courses` | Course and lesson CRUD, pagination, quizzes, lesson-type inheritance |
| `enrollments` | Student enrollments and quiz attempts |
| `progress` | Lesson progress (`LessonProgress`) and video watch progress (`WatchProgress`) |
| `corrections` | Assignment submissions with a full review workflow |
| `videos` | Video streaming via short-lived signed URLs |
| `storage` | File storage, orphan cleanup, image processing |
| `notifications` | Email delivery (real SMTP, or console fallback when unconfigured) |
| `orders` | Orders with manual payment approval |
| `certificates` | PDF certificate generation with QR verification, templates and ZIP export |
| `schedule` | Admin calendar and live-class scheduling with overlap detection |
| `push` | Web push subscriptions and reminder delivery |
| `name-change-requests` | Student-requested legal name changes with admin approval |

---

## Engineering practices

A few decisions worth calling out, since they are the reason the codebase behaves
predictably:

**Migrations are the single source of truth for the schema.** `synchronize` is `false` in
*every* environment, including tests. Migrations are registered explicitly in
`src/database/migrations-registry.ts` rather than discovered by glob, so what runs is always
intentional.

**The E2E suite runs the same migrations as production.** The test schema is not an
approximation built from entity metadata — it is the production schema, which matters here
because lesson types use table inheritance that a schema auto-builder cannot express.

**Destructive test setup is guarded in code.** E2E tests issue `DROP SCHEMA`. To make it
structurally impossible for that to hit a real database, `buildTypeOrmOptions()` throws and
refuses to boot in test mode unless the connection points at a local host with `test` or
`e2e` in the database name. The test database itself is ephemeral — a separate container on
port 5433 with its data in tmpfs.

**Video access is authenticated without leaking URLs.** `<video src>` cannot send an
`Authorization` header, so streaming uses a two-step signed-URL flow, and a middleware
blocks direct access to the static video directory.

**Deploys back up first.** `deploy.sh` takes a `pg_dump` snapshot before touching anything
and aborts the deploy if the dump comes out empty.

**Environment configuration fails fast.** A Joi schema validates every variable at startup;
a missing or malformed value stops the boot instead of surfacing as a runtime error later.
SMTP is validated all-or-nothing, so a half-configured mailer is caught immediately.

### Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and every pull request targeting it:

```
npm ci → build shared → build backend → backend unit tests
       → backend E2E tests → build frontend → frontend tests
```

---

## Prerequisites

- **Node.js** 20+ and **npm** 10+
- **Docker** and **Docker Compose** (for PostgreSQL)

---

## Getting started (development)

```bash
# 1. Install dependencies for every workspace
npm install

# 2. Configure environment variables
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
# Edit both .env files (DB credentials, a JWT_SECRET of 32+ chars, etc.)

# 3. Start PostgreSQL 16 (port 5432)
docker compose up -d db

# 4. Start the backend (port 3000) — applies pending migrations on boot
cd apps/backend && npm run start:dev

# 5. In another terminal, start the frontend (port 5173)
cd apps/frontend && npm run dev
```

Both servers must run simultaneously. The frontend calls the API at the URL defined by
`VITE_API_URL`.

> The public pages are behind the "coming soon" guard described above. Sign in with an
> `ADMIN` account to see them; otherwise you will land on the placeholder page.

---

## Tests

**Unit tests** need nothing running:

```bash
npm run test -w apps/backend     # Jest
npm run test -w apps/frontend    # Vitest
```

**E2E tests** need the isolated test database up first. It runs in its own container on port
5433 with data in tmpfs, so it can never contaminate development data:

```bash
docker compose -f docker-compose.test.yml up -d
npm run test:e2e -w apps/backend
docker compose -f docker-compose.test.yml down    # everything is discarded
```

Test-specific configuration lives in `apps/backend/.env.test`.

---

## Database migrations

`synchronize` is `false`, so schema changes require explicit migrations. After modifying an
entity:

```bash
cd apps/backend
npm run migration:generate   # review the generated file in src/database/migrations/
# Import it and add it to the MIGRATIONS array in src/database/migrations-registry.ts
npm run migration:run
```

Registration in `migrations-registry.ts` is required — migrations are not auto-discovered
from the filesystem in the CLI and test paths.

Runtime TypeORM configuration lives in `src/database/typeorm.config.ts`; in development and
production it applies pending migrations automatically on boot (`migrationsRun: true`).
`src/database/data-source.ts` is used only by the `migration:*` CLI scripts.

---

## Useful commands

**Backend** (`apps/backend/`):

```bash
npm run start:dev          # watch mode (port 3000)
npm run build              # compile to dist/ (also builds packages/shared first)
npm run test               # unit tests (Jest)
npm run test:e2e           # integration tests (supertest)
npm run migration:generate # diff entities vs DB → new migration
npm run migration:run      # apply pending migrations
npm run migration:revert   # roll back the last migration
```

**Frontend** (`apps/frontend/`):

```bash
npm run dev                # Vite dev server (port 5173)
npm run build              # production build
npm run test               # Vitest
```

> ⚠️ **Lint:** do not run `npm run lint` blindly — it invokes ESLint with `--fix` across the
> whole workspace and rewrites files unrelated to your change. Validate only what you
> touched with `npx eslint <path/to/file>`. Details in [`CLAUDE.md`](./CLAUDE.md).

---

## Deployment

`deploy.sh` runs on the server and performs, in order:

1. `pg_dump` backup of the database (aborts the deploy if the dump is empty; keeps the 10
   most recent under `backups/`)
2. `git pull origin main`
3. Install and build the frontend
4. Install and build the backend, which rebuilds `packages/shared` as part of its `prebuild`
   hook
5. Restart the API process with PM2

Pending migrations are applied automatically when the backend boots.

The repository also ships a containerized configuration — `docker-compose.yml` (services
`db` and `backend`, plus `apps/backend/Dockerfile`) and `nginx.conf` (reverse proxy for
`/api/`, plus static frontend serving and cache headers). SSL certificates live in `ssl/`
and are git-ignored, as are `backups/` and every real `.env`.

---

## Environment variables

Documented templates: [`apps/backend/.env.example`](./apps/backend/.env.example) and
[`apps/frontend/.env.example`](./apps/frontend/.env.example). Both are validated at startup
on the backend by a Joi schema. Real `.env` files are git-ignored and must never be
committed.

Note that Vite only exposes variables prefixed with `VITE_` to the browser — never put a
secret in one.
