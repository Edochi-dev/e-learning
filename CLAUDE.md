# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

> **Principle behind this document:** it holds the **rules** and the **reasons** — the
> things that don't expire. Inventories that change with every feature (route lists,
> gateway bindings, module lists) are **not copied here**; instead it documents *how to
> discover them*, because a command always tells the truth while a table only told it on
> the day it was written.
> For a functional overview of the product and its modules, see [`README.md`](./README.md).

---

## Commands

All commands run from the **monorepo root** unless noted.
npm workspaces: `apps/*` and `packages/*`.

```bash
# Install dependencies for every workspace
npm install

# Development infrastructure
docker compose up -d db     # PostgreSQL 16 only (port 5432) — the usual local setup
docker compose up -d        # also starts the backend container (port 3002:3000)
```

**Backend** (from `apps/backend/`):

```bash
npm run start:dev           # watch mode (port 3000)
npm run build               # compiles to dist/ — the `prebuild` hook builds packages/shared first
npm run test                # Jest, unit tests
npm run test -- --testPathPatterns=courses   # single file by pattern (note: --testPathPatterns, plural)
npm run test:e2e            # Jest with test/jest-e2e.json — needs the test DB running (see below)
npm run lint                # ⚠️ DO NOT RUN — see "Lint hygiene"

# TypeORM migrations (require the DB running and apps/backend/.env)
npm run migration:generate  # diff entities vs DB → new file in src/database/migrations/
npm run migration:run       # apply pending migrations
npm run migration:revert    # roll back the last one
```

**Frontend** (from `apps/frontend/`):

```bash
npm run dev                 # Vite (port 5173)
npm run build               # tsc -b && vite build
npm run test                # Vitest (run)
npm run lint                # ⚠️ DO NOT RUN — see "Lint hygiene"
```

The full application needs **both servers running simultaneously**.

### E2E tests

The E2E suite runs against an **isolated, ephemeral database** (its own container, port
5433, data in tmpfs → wiped on shutdown). It never touches the development database.

```bash
docker compose -f docker-compose.test.yml up -d
npm run test:e2e -w apps/backend
docker compose -f docker-compose.test.yml down    # everything is discarded
```

Configuration lives in `apps/backend/.env.test`. The isolation is enforced in code by a
safety guard (see "Migrations and TypeORM configuration").

### CI

`.github/workflows/ci.yml` runs, in this order:

1. `npm ci`
2. build `packages/shared`
3. build `apps/backend`
4. backend unit tests
5. backend **E2E tests**
6. build `apps/frontend`
7. frontend tests

Reproduce that sequence locally before opening a PR. If CI fails at a step, the failure
belongs to that step — don't assume flakiness by default.

---

## ⚠️ Lint hygiene (CRITICAL)

**Never run `npm run lint`** (in either `apps/backend/` or `apps/frontend/`). Both scripts
invoke ESLint with `--fix` across the **entire workspace** (`{src,apps,libs,test}/**/*.ts`
in the backend, `.` in the frontend), not just the files touched in the current session.
That rewrites dozens of unrelated files on disk (cosmetic churn: quotes, trailing commas,
import order) and pollutes `git status` with noise outside the commit's scope.

**Rule:** validate lint only with `npx eslint <path/to/file>` (no `--fix`), and only on the
files the current session actually changed. Pre-existing lint errors elsewhere in the repo
are **not the current task's responsibility** — propose them as a separate, deliberate
commit; never drag them in as a side effect.

If `npm run lint` was run by mistake and files outside the scope show up as modified,
revert them immediately with `git checkout HEAD -- <unrelated files>` before staging
anything.

---

## Working instructions

- Act as a teacher for a junior developer.
- **Always explain code in Spanish**, in a way a junior developer can follow. This document
  is written in English, but the conversation with the developer is in Spanish.
- Explain the logic, the process and the structure in depth, so the junior retains concepts
  rather than snippets — **in the chat, not in the source files** (see below).

### Code comments

**Teaching explanations belong in the chat. They must never be written into the code.**
This repository is public and read by potential employers; a codebase narrating language
and framework basics reads like a tutorial, not like production software.

A comment earns its place only if it tells a maintainer something the code cannot:

- A non-obvious constraint (`this guard must run after AuthGuard, which populates req.user`).
- A security invariant, phrased as a warning (`do not switch this to COMPLETED to unblock
  the flow — it would grant free access`).
- A gotcha that looks like a bug but is deliberate.
- A decision whose alternative looks more obvious than it is.

Do **not** write:

- Restatements of what the code plainly says.
- Explanations of language or framework features (what `@ManyToOne` does, why
  `@PrimaryColumn` and not `@PrimaryGeneratedColumn`, how DI works).
- Narrative history of a bug and its fix — that belongs in the commit message and the
  GitHub issue, which are the tools built for it.
- Section banners and decorative ASCII separators inside a function body.

Keep them short. If a comment needs more than about five lines, the explanation probably
belongs in the chat, in the commit message, or in an issue.
- Always follow **pure** Clean Architecture — no shortcuts.
- **The metric is architectural correctness, not file count.** Never dismiss a correct
  design as "over-engineering", and never trade correct design for implementation speed.
  Equally, don't add layers that solve no real problem. Concretely:
  - Prefer **parent–child inheritance** (table inheritance / separate entities per subtype)
    over a single table with nullable columns and per-type conditionals.
  - Prefer **polymorphism** over `if/else` chains or `switch` statements that ask for a type.
  - Prefer **interface segregation** (ISP) over gateways that grow without bound.
  - If a design pattern applies (Strategy, Factory, …), use it — don't reinvent it with
    conditionals.

### Commits

Always remind the developer to commit, and hand them a well-structured message **in
English**:

```
refactor(certificates): segregate search and list methods in Gateway

- Split CertificateGateway into explicit 'list' and 'search' methods.
- Apply Interface Segregation Principle (ISP) to improve contract clarity.
- Update CertificatesController to delegate to specific Use Cases based on intent.
- Decouple filtering semantics from basic collection listing.
```

A commit must reflect **exactly** what changed in that working session — no more, no less.
Repeating a previous commit's scope in a new one lies to the git history. Do not add
trailers or signatures (`Co-Authored-By`, etc.) to commit messages.

---

## Oral exam

When the developer says **"examen"**, run an oral exam on the topics covered in the session.

Rules:

- The developer is training to be an **AI-augmented fullstack developer**: AI can generate
  the specific code, but he must understand the structure, the logic and how it works.
- Therefore questions must target **concepts, architecture and reasoning** — not syntax or
  specific APIs.
- Good questions: "Why does X live in this layer and not another?", "What would break if we
  removed Y?", "What's the difference between A and B, and when would you use each?",
  "What problem does this pattern solve?"
- Bad questions: "How do you write the X decorator?", "What's the name of method Y?"
- Ask **one question at a time**. Wait for the answer before moving on.
- Finish with honest feedback: what he understood well, and what he needs to review.
- Conduct the exam in Spanish.

---

## Monorepo structure

```
apps/backend/     NestJS 11 REST API
apps/frontend/    React 19 + Vite SPA
packages/shared/  Shared domain interfaces and enums (@maris-nails/shared)
```

### The shared package (`@maris-nails/shared`)

Its source is a single file at the **package root**: `packages/shared/index.ts` (there is no
`src/` folder). It is consumed in two different ways, and the distinction matters:

- **At type-check time**, both apps resolve it through a path alias pointing straight at the
  **source** (`../../packages/shared/index.ts`) — via `paths` in the `tsconfig` files, plus
  an `alias` in `vite.config.ts` for the frontend.
- **At runtime**, the backend resolves `@maris-nails/shared` through node_modules → the
  package's `package.json` → `main: dist/index.js`. In other words, **the backend needs the
  package compiled**.

That's why `apps/backend/package.json` declares a `prebuild` hook running
`npm run build -w @maris-nails/shared` before every backend build. If you change `shared`
and the backend behaves like it's running stale code (or can't resolve the module), that
build is what's missing.

**Important convention:** `UserRole`, `LessonType`, `CourseLevel`, `OrderStatus` and friends
are **not TypeScript `enum`s** — they are `as const` objects plus a derived union type. This
is required by `erasableSyntaxOnly` in the frontend, which forbids TS syntax that emits
runtime code. For the same reason, **do not use the `constructor(private readonly x)`
shorthand in the frontend**: declare the field explicitly and assign it in the constructor.
(In the backend the shorthand is fine — it's idiomatic NestJS.)

### Dependency placement

NestJS/database packages shared across the monorepo (`@nestjs/typeorm`, `typeorm`, `pg`,
`bcrypt`, `@nestjs/throttler`, …) belong in the **root `package.json`**. App-specific
packages go in that app's own `package.json`.

---

## Backend architecture

Strict Clean Architecture. **Dependencies always point inward** — controllers depend on use
cases, use cases depend on abstract gateways, repositories implement those gateways.

```
HTTP Request → Controller → UseCase → Gateway (abstract) ← Repository (concrete, TypeORM)
```

### Gateways are abstract classes, not interfaces

This is deliberate: NestJS dependency injection needs a **token that exists at runtime**, and
TypeScript interfaces vanish at compile time. Each module binds the abstraction to its
implementation:

```typescript
// in courses.module.ts
{ provide: CourseGateway, useClass: CoursesRepository }
```

To switch to S3, for example, implement an `S3FileStorageGateway` and change the binding in
`StorageModule` — the use cases stay untouched.

**Frontend gateways, by contrast, are interfaces** (`.ts`), because there is no DI container
there that needs runtime tokens.

### Discovering the current state

There is deliberately no binding table here — there are dozens, and they change with every
feature.

```bash
# Every abstraction → implementation binding
grep -rn "provide: .*Gateway" apps/backend/src --include=*.module.ts

# Every abstract gateway that exists
find apps/backend/src -name "*.gateway.ts"

# Registered business modules
ls apps/backend/src
```

The module-by-module breakdown of responsibilities lives in the [`README.md`](./README.md).

### Adding a new feature

Inside `src/<feature>/`:

1. `entities/` — TypeORM entities.
2. `gateways/<feature>.gateway.ts` — abstract class holding the contract. Segregate by
   responsibility: two small gateways beat one that does everything.
3. `dto/` — input DTOs with validation (`class-validator`).
4. `use-cases/<do-something>.use-case.ts` — `@Injectable()`, depends on the abstract
   gateway. One use case, one intent.
5. `<feature>.repository.ts` — implements the gateway with TypeORM.
6. `adapters/` — gateway implementations that talk to external services (SMTP, PDF, ZIP,
   QR…), where applicable.
7. `<feature>.controller.ts` — delegates to use cases; no business logic.
8. `<feature>.module.ts` — imports the entities, declares the `{ provide, useClass }`
   bindings, and lists the use cases as providers.

Then: a migration for any new entities (see below), and tests.

### Migrations and TypeORM configuration

`synchronize` is **always `false`**, in every environment. Versioned migrations are the
single source of truth for the schema.

Three files carry distinct roles — don't conflate them:

| File | Role |
|---|---|
| `src/database/typeorm.config.ts` | `buildTypeOrmOptions()`: **runtime** config consumed by `app.module.ts`. Branches between dev/prod and test. |
| `src/database/data-source.ts` | **CLI only** — used by the `migration:*` scripts. Loads `.env` via `dotenv/config`. |
| `src/database/migrations-registry.ts` | **Explicit** migration registry (`MIGRATIONS`). |

Flow for a schema change:

```bash
# 1. Modify the entity in src/<feature>/entities/
cd apps/backend && npm run migration:generate
# 2. Review the generated file in src/database/migrations/
# 3. IMPORTANT: import it and add it to the MIGRATIONS array in migrations-registry.ts.
#    If you skip that, neither the CLI nor the E2E suite will see it.
npm run migration:run
```

Per-environment behaviour (in `buildTypeOrmOptions()`):

- **dev / prod** (`NODE_ENV !== 'test'`): `migrationsRun: true` — pending migrations are
  applied at startup from the compiled `.js` glob in `dist/`.
- **test** (`NODE_ENV === 'test'`): the schema is provisioned by `test/global-setup-e2e.ts`,
  which runs **the same migrations as production**, so the test schema is identical to the
  real one rather than an approximation.

**Safety guard:** in test mode, `buildTypeOrmOptions()` **throws and aborts** unless the
connection points at a local host (`localhost`/`127.0.0.1`) with `test` or `e2e` in the
database name. The tests issue `DROP SCHEMA`, which is destructive; this makes it
structurally impossible for them to hit the development or production database. **Do not
weaken this check.**

### Auth and rate limiting

- JWT via `@nestjs/passport`. Protect routes with `@UseGuards(AuthGuard('jwt'))`.
- Roles: `@UseGuards(AuthGuard('jwt'), RolesGuard)` + `@Roles(UserRole.ADMIN)`.
- Rate limiting: `ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }])` is registered in
  `app.module.ts`, but there is **no `APP_GUARD`** — registering it does not apply it. It is
  enabled **per controller** with `@UseGuards(ThrottlerGuard)` + `@Throttle()`.
  To find where it's applied:
  `grep -rln "@Throttle" apps/backend/src --include=*.controller.ts`

### Video streaming

`<video src>` tags cannot send `Authorization` headers. Streaming therefore uses a
**two-step signed-URL flow**:

1. The frontend calls `GET /videos/:lessonId/signed-url` with the JWT → receives a
   short-lived signed URL (`VIDEO_TOKEN_EXPIRY_HOURS`, default 2).
2. It sets that URL as `<video src>` → the browser hits
   `GET /videos/stream?path=...&token=...`.
3. `BlockVideoStaticMiddleware` blocks direct access to `/static/videos/*`.

Files live in `apps/backend/public/videos/`. Orphan cleanup: before deleting a file,
`isVideoUrlReferenced()` verifies no other lesson still points at that URL.

**Do not "fix" this by adding an `Authorization` header** — that is precisely the thing that
cannot be done.

---

## Frontend architecture

```
App.tsx (creates gateway instances) → Page (receives the gateway as a prop) → Hook → Gateway interface → HTTP Gateway
```

- **Gateways** (`src/gateways/`) separate the HTTP implementation from business logic. Pages
  never call `fetch` directly.
- **Hooks** (`src/hooks/`) own loading/error state and call gateway methods.
- **Pages** receive gateway instances as **props**, not from a global singleton — which keeps
  them independently testable.
- Instances are created **once** in `App.tsx` with `useMemo` and passed down.

### Backend URL

**It is not hardcoded.** It lives in `apps/frontend/src/config.ts`:

```typescript
export const API_URL = import.meta.env.VITE_API_URL as string;
```

This requires `VITE_API_URL` in `apps/frontend/.env` (template in `.env.example`). If
requests fail against an `undefined/...` URL, that variable is missing.

### ComingSoonGuard (important)

The site is in "coming soon" mode. `ComingSoonGuard` wraps the **public** routes (home,
catalog, course details, lesson) and applies this rule:

- User with the **ADMIN** role → sees the real page.
- Everyone else (including anonymous visitors) → sees `ComingSoonPage`.

The catch-all `*` route also renders `ComingSoonPage`.

**Practical consequence:** if you test something without an admin session and land on the
"coming soon" screen, **that is not a bug** — it's the guard. Authenticate as ADMIN before
concluding anything is broken.

### Routes

Every route is declared in one place: `apps/frontend/src/App.tsx`. Read them from there;
they are not duplicated here. They are grouped by access level: public, wrapped in
`ComingSoonGuard`, JWT-protected, and ADMIN-only. User-facing URLs are **in Spanish**
(`/cursos`, `/registro`, `/cuenta`, `/mis-cursos`, `/admin/certificados`…) — keep that
convention when adding new ones.

### Design system

All tokens are CSS custom properties in `App.css`. Primary palette: **Rose Pink**
(`--primary: #e84393`) + **gold** (`--gold: #CD9E55`). Dark mode via `[data-theme='dark']`
on `<html>`, persisted in localStorage — every token is redefined there. Fonts:
`--font-heading` = Kaushan Script, `--font-body` = DM Sans (loaded from Google Fonts in
`index.html`).

When adding UI sections, extend `App.css` using the existing tokens — **never hardcoded
colors**, since those would break dark mode.

Motion and animation on this site are **intentional**: do not add a global
`prefers-reduced-motion` rule that disables them unless explicitly asked.

---

## Environment variables

**Source of truth: `apps/backend/.env.example`** (a commented template) together with the
**Joi** schema in `app.module.ts`, which validates at startup. If a required variable is
missing or malformed, NestJS **refuses to boot** (fail-fast). The list is not duplicated
here.

Worth knowing:

- `JWT_SECRET` requires at least 32 characters.
- **SMTP is optional and all-or-nothing:** if you set `SMTP_HOST`, Joi also requires
  `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `SMTP_FROM`. If you don't set it, the
  notifications module falls back to `ConsoleNotificationGateway` (it logs the email
  instead of sending it).
- **`VAPID_*`** (web push) and **`VIDEO_TOKEN_EXPIRY_HOURS`** are used in code and present in
  the Joi schema as optional, but are **not yet in `.env.example`**. If you touch those
  features, document them there.
- The `POSTGRES_*` variables in the same `.env` are what the Docker image reads to create the
  user and database on first boot; they must match the `DB_*` values.
- Frontend: `apps/frontend/.env` with `VITE_API_URL`.

---

## Deployment

`deploy.sh` runs **on the server** (`/home/cerberus/e-learning`) and performs, in order:

1. **Backup** of PostgreSQL via `pg_dump` from the `mn_postgres` container. Aborts the deploy
   if the dump comes out empty. Keeps the 10 most recent.
2. `git pull origin main`
3. `npm ci` **once, from the monorepo root.** Never `cd apps/backend && npm install` (or
   frontend) — a stray local `node_modules` there once caused npm to treat that folder as
   a standalone project, silently missing root-declared dependencies
   (`@nestjs/schedule` is a real example: installing from inside `apps/backend/` audited
   969 packages instead of the monorepo's actual 1284). `npm ci` from the root, matching
   `ci.yml`, always reinstalls clean from the lockfile — this class of bug becomes
   structurally impossible.
4. `npm run build -w apps/frontend`
5. `npm run build -w apps/backend` (the `prebuild` hook rebuilds `shared` first)
6. `pm2 restart marisnails-api`

Pending migrations are applied automatically when the backend boots
(`migrationsRun: true`).

**Reverse proxy.** The `nginx.conf` in this repository is the **local/containerized**
configuration (it proxies to the `backend` Docker service name). Production sits behind a
**system-level nginx on a shared server that also hosts unrelated projects**
(`campayo`, `dopa`, `dopa-next`, `ikigai`), and that configuration is **not versioned
here**. Do not assume the repo's `nginx.conf` reflects production routing.

**The production API runs under PM2**, as the process `marisnails-api`, on **port 3002**
(not 3000 — port 3000 on that shared server belongs to a different project, `ikigai`).
`PORT=3002` is set in the server's `apps/backend/.env`, overriding the `3000` default used
for local development. `deploy.sh` deliberately never runs `docker compose up` or rebuilds
a container image: rebuilding and restarting the PM2 process **is** the deploy.

`docker-compose.yml` also defines a `backend` service (port `3002:3000`). **It is not the
deployment path and must stay stopped.** History matters here: this container was the one
actually receiving production traffic for roughly five months, unrelated to and never
touched by `deploy.sh`, while system nginx's `proxy_pass` pointed at its port. Real user
uploads (certificates, videos, corrections) written by that container had no volume mount
and lived only in its writable layer. The incident was resolved by rescuing those files
with `docker cp`, merging them into the host's `apps/backend/public/`, stopping the
container, and disabling its `restart: always` policy
(`docker update --restart=no mn_backend`) so it cannot silently reappear after a host
reboot and reclaim the port. It was kept (stopped, not removed) only as a rollback option.

**Takeaway for future changes here:** before trusting any claim about "what serves
production," verify the actual system nginx `proxy_pass` target
(`grep -r proxy_pass /etc/nginx/` on the server) and cross-check it against what's
actually listening on that port (`sudo lsof -i :<port>`). Do not assume the deploy script
describes the live path — on this server, for five months, it didn't.
