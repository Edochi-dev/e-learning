# Frontend — Maris Nails Academy

SPA en **React 19 + Vite** con TypeScript.

> Este README cubre solo la app de frontend. Para visión general del monorepo y
> arquitectura, ver el [README de la raíz](../../README.md) y [`CLAUDE.md`](../../CLAUDE.md).

## Arranque rápido

```bash
cp .env.example .env        # ajusta VITE_API_URL (URL del backend)
npm run dev                 # servidor de desarrollo en el puerto 5173
```

El backend debe estar corriendo en paralelo (puerto 3000 por defecto).

## Comandos

```bash
npm run dev                 # servidor de desarrollo (Vite)
npm run build               # build de producción (tsc -b && vite build)
npm run test                # tests con Vitest
npm run preview             # sirve el build de producción localmente
```

## Arquitectura

```
App.tsx (crea los gateways con useMemo) → Page (recibe el gateway por prop)
       → Hook (estado de carga/error) → Gateway (interfaz) → HttpGateway (fetch)
```

- **Gateways** (`src/gateways/`): separan la implementación HTTP de la lógica. Las páginas
  nunca llaman a `fetch` directamente.
- **Hooks** (`src/hooks/`): dueños del estado de carga/error; llaman a métodos del gateway.
- **Pages** (`src/pages/`): reciben las instancias de gateway como **props** (no singletons
  globales), lo que las mantiene testeables de forma independiente.

> Nota: `erasableSyntaxOnly` está activo — no uses el shorthand `constructor(private readonly x)`;
> declara el campo y asígnalo en el constructor.
