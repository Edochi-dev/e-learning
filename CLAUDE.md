# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the **monorepo root** unless noted.

```bash
# Install all workspace dependencies
npm install

# Start infrastructure
docker-compose up -d        # PostgreSQL 16 on port 5432
```

**Backend** (run from `apps/backend/`):
```bash
npm run start:dev           # Dev server with watch (port 3000)
npm run build               # Compile TypeScript → dist/
npm run lint                # ESLint with autofix
npm run test                # Jest (all spec files)
npm run test -- --testPathPattern=courses   # Run a single test file by pattern

# TypeORM Migrations (requires DB running and apps/backend/.env present)
npm run migration:generate  # Diff entities vs DB → new migration file in src/database/migrations/
npm run migration:run       # Apply pending migrations
npm run migration:revert    # Rollback last migration
```

**Frontend** (run from `apps/frontend/`):
```bash
npm run dev                 # Vite dev server (port 5173)
npm run build               # Production build
npm run lint                # ESLint
```

Both servers must be running simultaneously for full functionality. The frontend calls the backend at `http://localhost:3000` (hardcoded in `App.tsx`).

## Instructions

- Be a Teacher for a junior developer
- Always explain your code in Spanish and and make sure to explain it in a way that a junior developer can understand
- Always code following the Clean Architecture

## Monorepo Structure

```
apps/backend/    NestJS 11 REST API
apps/frontend/   React 19 + Vite SPA
packages/shared/ TypeScript interfaces & enums shared across both apps
```

**Shared package (`@maris-nails/shared`)**: exports all domain interfaces (`Course`, `Lesson`, `User`) and `UserRole` enum. Path alias resolves via `tsconfig.json` `paths` in each app. Changes here affect both apps.

**Dependency placement rule**: NestJS/database packages shared across the monorepo (`@nestjs/typeorm`, `typeorm`, `pg`, `bcrypt`, `@nestjs/throttler`, etc.) live in **root `package.json`**. App-specific packages go in each app's own `package.json`. Frontend-only packages go in `apps/frontend/package.json`.

## Backend Architecture

Strict Clean Architecture. **Dependency direction is always inward** — controllers depend on use cases, use cases depend on abstract gateways, repositories implement gateways.

```
HTTP Request → Controller → UseCase → Gateway (abstract) ← Repository (concrete, TypeORM)
```

### Gateways are abstract classes, not interfaces

This is intentional — NestJS DI requires a runtime token, which interfaces don't provide. Each module wires the abstraction to its implementation:

```typescript
// In courses.module.ts
{ provide: CourseGateway, useClass: CoursesRepository }
```

Current gateway bindings:
| Abstract | Concrete | Module |
|---|---|---|
| `CourseGateway` | `CoursesRepository` | `CoursesModule` |
| `UserGateway` | `UsersService` | `UsersModule` |
| `TokenGateway` | `JwtTokenService` | `UsersModule` |
| `FileStorageGateway` | `LocalFileStorageGateway` | `StorageModule` |
| `VideoStreamGateway` | `LocalVideoStreamGateway` | `VideosModule` |

To swap to S3, implement a new `S3FileStorageGateway` and change the binding in `StorageModule` — use cases are untouched.

### Adding a new feature

1. `src/feature/gateways/feature.gateway.ts` — abstract class with method contracts
2. `src/feature/use-cases/do-something.use-case.ts` — `@Injectable()`, depends on the gateway
3. `src/feature/feature.repository.ts` — implements the gateway using TypeORM
4. `src/feature/feature.module.ts` — imports TypeORM entities, wires `{ provide, useClass }`, lists use cases as providers

### TypeORM Migrations

`synchronize` is **`false`**. Schema changes require migrations:

```bash
# After modifying an entity in src/*/entities/:
cd apps/backend && npm run migration:generate
# Review generated file in src/database/migrations/
npm run migration:run
```

`migrationsRun: true` in `app.module.ts` auto-runs pending migrations on startup. `src/database/data-source.ts` is **CLI-only** (used by migration scripts, loads `.env` via `dotenv/config`). Runtime DB config lives entirely in `app.module.ts`.

### Auth & Rate Limiting

- JWT via `@nestjs/passport`. Protect routes with `@UseGuards(AuthGuard('jwt'))`.
- Role enforcement: `@UseGuards(AuthGuard('jwt'), RolesGuard)` + `@Roles(UserRole.ADMIN)`.
- Rate limiting is **not global** — applied only to `UsersController` auth endpoints:
  - `POST /users` (register): 5 req/min
  - `POST /users/login`: 10 req/min
  - Implemented via `@UseGuards(ThrottlerGuard)` + `@Throttle()` per method.

### Video Streaming

`<video src>` tags cannot set `Authorization` headers, so streaming uses a two-step signed URL flow:

1. Frontend calls `GET /videos/:lessonId/signed-url` with JWT → gets a short-lived signed URL
2. Frontend sets that URL as `<video src>` → browser hits `GET /videos/stream?path=...&token=...`
3. `BlockVideoStaticMiddleware` blocks direct access to `/static/videos/*`

Video files live in `apps/backend/public/videos/`. Orphan cleanup: before deleting a video file, `isVideoUrlReferenced()` checks whether any other lesson still uses that URL.

## Frontend Architecture

```
App.tsx (creates gateway instances) → Page (receives gateway as prop) → Hook → Gateway interface → HTTP Gateway
```

- **Gateways** (`src/gateways/`) separate the HTTP implementation from business logic. Pages never call `fetch` directly.
- **Hooks** (`src/hooks/`) own loading/error state and call gateway methods.
- **Pages** receive gateway instances as **props**, not from a global singleton — keeps them independently testable.
- Gateway instances are created **once** in `App.tsx` with `useMemo` and passed down as props.

### Routing

| Path | Page | Guard |
|---|---|---|
| `/` | `HomePage` | Public |
| `/catalogo` | `CatalogPage` | Public |
| `/login` | `LoginPage` | Public |
| `/courses/:id` | `CourseDetailsPage` | Public |
| `/courses/:courseId/lessons/:lessonId` | `LessonPage` | JWT required |
| `/admin` | `AdminDashboardPage` | ADMIN role |
| `/admin/courses/new` | `CreateCoursePage` | ADMIN role |
| `/admin/courses/:id/edit` | `EditCoursePage` | ADMIN role |
| `/admin/courses/:id/lessons` | `ManageLessonsPage` | ADMIN role |

### Design System

All tokens are CSS custom properties in `App.css`. Primary palette: **Rose Pink** (`--primary: #e84393`) + **Champagne Gold** (`--gold: #d4a574`). Dark mode via `[data-theme='dark']` on `<html>`, persisted in localStorage. Fonts: `--font-heading` = Playfair Display, `--font-body` = DM Sans (loaded via Google Fonts in `index.html`).

When adding new UI sections, append styles to `App.css` and use existing tokens — avoid hardcoded colors.

## Environment Variables

Backend reads from `apps/backend/.env`:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=
DB_PASSWORD=
DB_NAME=
JWT_SECRET=
PORT=3000
```
