# Backend — Maris Nails Academy

API REST en **NestJS 11** con **Clean Architecture (hexagonal)** y **TypeORM + PostgreSQL 16**.

> Este README cubre solo la app de backend. Para visión general del monorepo, arquitectura
> y despliegue, ver el [README de la raíz](../../README.md) y [`CLAUDE.md`](../../CLAUDE.md).

## Arranque rápido

```bash
cp .env.example .env        # rellena DB_*, JWT_SECRET (32+ chars), etc.
docker-compose up -d db     # PostgreSQL (desde la raíz del monorepo)
npm run start:dev           # servidor con watch en el puerto 3000
```

`migrationsRun: true` aplica las migraciones pendientes al arrancar.

## Comandos

```bash
npm run build               # compila a dist/
npm run test                # tests unitarios (Jest)
npm run test:e2e            # tests de integración (supertest)
npm run migration:generate  # genera migración a partir del diff de entidades
npm run migration:run       # aplica migraciones pendientes
npm run migration:revert    # revierte la última migración
```

## Estructura por módulo

Cada feature sigue el mismo patrón:

```
src/feature/
  gateways/feature.gateway.ts      # clase abstracta (contrato)
  use-cases/do-something.use-case.ts
  feature.repository.ts            # implementa el gateway con TypeORM
  entities/feature.entity.ts
  feature.controller.ts
  feature.module.ts                # wiring: { provide: Gateway, useClass: Repository }
```

> ⚠️ No ejecutes `npm run lint` (corre `--fix` sobre todo el workspace). Valida solo los
> archivos que tocaste con `npx eslint <ruta>`.
