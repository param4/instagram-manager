# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**insta-uploader** — A NestJS backend for uploading to Instagram and managing Instagram-related tasks. Built with a modular, plug-and-play architecture where each feature is a self-contained module.

## Commands

- **Package manager:** pnpm
- **Install dependencies:** `pnpm install`
- **Dev server:** `pnpm start:dev` (hot-reload)
- **Build:** `pnpm build`
- **Start production:** `pnpm start:prod`
- **Lint:** `pnpm lint`
- **Format:** `pnpm format`
- **Run all tests:** `pnpm test`
- **Run single test:** `pnpm test -- --testPathPattern=<pattern>`
- **Watch tests:** `pnpm test:watch`
- **E2E tests:** `pnpm test:e2e`
- **Coverage:** `pnpm test:cov`

## Architecture

NestJS app using module-per-feature pattern with DDD-style layering inside each module.

### Layout

- `src/app.module.ts` — Root module. Pure orchestrator that only imports other modules. All feature toggling happens here.
- `src/main.ts` — Bootstrap with global ValidationPipe, `/api` prefix, CORS.
- `src/common/` — `@Global` module: exception filters, interceptors, constants, types, decorators, guards, pipes, utils. Auto-applied to all requests.
- `src/config/` — `@Global` module: typed ConfigService wrapping `@nestjs/config` with env validation on startup (fail-fast).
- `src/database/` — TypeORM + PostgreSQL via `forRootAsync`. Uses `autoLoadEntities: true` so entities register automatically when their module imports `TypeOrmModule.forFeature()`.
- `src/modules/` — All feature modules. Each is self-contained and removable.

### DDD layers inside each feature module

```
src/modules/<feature>/
├── <feature>.module.ts          # NestJS module definition
├── presentation/
│   └── <feature>.controller.ts  # HTTP layer
├── application/
│   ├── <feature>.service.ts     # Business logic
│   └── model/                   # Request/response models (class-validator decorated)
│       └── create-<feature>.model.ts
├── domain/
│   ├── entities/
│   │   └── <feature>.entity.ts  # TypeORM entity
│   └── types/
│       └── <feature>.type.ts    # Type aliases
└── index.ts                     # Barrel export
```

### Plug-and-play contract

**Add a module:** Create folder under `src/modules/`, add one import to `src/app.module.ts`.
**Remove a module:** Delete the folder, remove the import from `src/app.module.ts`.

No other files need to change.

### Database access

Use TypeORM's built-in `Repository<Entity>` directly in services via `@InjectRepository()`. No custom repository layer.

## Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Service | `<name>.service.ts` | `upload.service.ts` |
| Controller | `<name>.controller.ts` | `upload.controller.ts` |
| Module | `<name>.module.ts` | `upload.module.ts` |
| Model | `<action>-<name>.model.ts` | `create-upload.model.ts` |
| Entity | `<name>.entity.ts` | `upload.entity.ts` |
| Type | `<name>.type.ts` | `response.type.ts` |
| Constant | `<name>.constant.ts` | `app.constant.ts` |
| Util | `<name>.util.ts` | `hash.util.ts` |
| Guard | `<name>.guard.ts` | `auth.guard.ts` |
| Filter | `<name>.filter.ts` | `http-exception.filter.ts` |
| Interceptor | `<name>.interceptor.ts` | `logging.interceptor.ts` |
| Pipe | `<name>.pipe.ts` | `validation.pipe.ts` |
| Decorator | `<name>.decorator.ts` | `roles.decorator.ts` |
| Enum | `<name>.enum.ts` | `status.enum.ts` |

## Path Aliases

Configured in `tsconfig.json` and Jest `moduleNameMapper`:
- `@common/*` → `src/common/*`
- `@config/*` → `src/config/*`
- `@database/*` → `src/database/*`
- `@modules/*` → `src/modules/*`

## Environment

Copy `.env.example` to `.env` before running. Config validation will fail-fast on boot if required vars are missing.
