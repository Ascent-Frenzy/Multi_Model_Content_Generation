# Multi-Modal Content Generation Platform

AI-powered platform for generating branded social media content (carousels + reels) and autonomously scheduling Instagram posts.

## Full Design Spec

`docs/superpowers/specs/2026-05-17-ai-multimodal-synthesis-design.md`

Read this first. It contains all schemas, data flows, BullMQ job payloads, and API contracts.

---

## Monorepo Structure

```
apps/
  frontend/         → Next.js 14 (branch: feature/frontend)
  backend/          → NestJS API + AgentModule (branch: feature/backend)
  worker-renderer/  → NestJS + BullMQ + FFmpeg (branch: feature/worker-renderer)
packages/
  types/            → @app/types  — shared TypeScript interfaces
  dtos/             → @app/dtos   — class-validator DTOs (used by backend)
  constants/        → @app/constants — queue names, enums, limits
  utils/            → @app/utils  — shared pure functions
```

Each developer works on their branch. Changes to `packages/` must be coordinated — open a PR to `main` and tag the other two developers.

---

## Tech Stack Summary

| Service | Key Libraries |
|---|---|
| Frontend | Next.js 14, Tailwind, shadcn/ui, Zustand, TanStack Query, Fabric.js, Socket.io-client |
| Backend | NestJS, Prisma, PostgreSQL, BullMQ (producer), Redis, Anthropic SDK, Passport JWT, Socket.io |
| Worker | NestJS, BullMQ (consumers), fluent-ffmpeg, fal-ai/client, ElevenLabs SDK, sharp |

---

## Infrastructure (local dev)

Run via Docker Compose:
- **PostgreSQL** on `5432`
- **Redis** on `6379`
- **Backend** on `4000`
- **Worker-Renderer** on `4001`
- **Frontend** on `3000`

```bash
docker compose up -d postgres redis
```

---

## Service Ports

| Service | Port |
|---|---|
| Frontend (Next.js) | 3000 |
| Backend (NestJS) | 4000 |
| Worker-Renderer (NestJS) | 4001 |
| PostgreSQL | 5432 |
| Redis | 6379 |

---

## Shared Package Usage

```typescript
// In backend or worker-renderer
import { ContentStatus, JobType } from '@app/constants';
import { CreateCarouselDto } from '@app/dtos';
import { ContentItem, RenderJob } from '@app/types';
```

Never define shared types inside an app — put them in `packages/` so all three services stay in sync.

---

## Cross-Service Contracts

The contract between backend and worker-renderer is the **BullMQ job payload**. Do not change job payload shapes without updating `@app/types` and coordinating with the worker developer.

The contract between frontend and backend is the **REST API + WebSocket events**. Do not rename endpoints without updating `@app/dtos` and coordinating with the frontend developer.

---

## Key Architectural Decisions

- **Presigned S3 uploads**: user-uploaded clips go directly from the browser to S3. The backend only issues the URL and confirms the upload — it never proxies file bytes.
- **AgentModule lives in the backend for v1**: it's a NestJS module (not a separate service). It can be extracted later without touching the API code.
- **Two BullMQ queues**: `render-queue` (heavy FFmpeg work) and `social-queue` (Instagram API calls). Scale them independently.
- **Delayed jobs for scheduling**: Instagram posts are dispatched as BullMQ delayed jobs set to fire at `scheduledAt`. No polling cron needed in the worker.
- **AES-256 encryption on Instagram access tokens**: encrypted before writing to DB, decrypted by the backend immediately before dispatching the `instagram_post` job payload.
