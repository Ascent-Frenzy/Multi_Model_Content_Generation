# Backend — apps/backend

**Branch:** `feature/backend`  
**Framework:** NestJS  
**Developer owns:** everything in `apps/backend/` and `packages/dtos/`

Read the root `CLAUDE.md` and the full spec first:  
`docs/superpowers/specs/2026-05-17-ai-multimodal-synthesis-design.md`

---

## Responsibility

REST API + WebSocket gateway + AgentModule. This is the only service that talks to PostgreSQL directly (via Prisma). It produces BullMQ jobs but never consumes them.

---

## Module Structure

```
src/
  app.module.ts

  api/                         ← ApiModule (REST + WebSocket)
    auth/
      auth.module.ts
      auth.controller.ts       ← POST /auth/register, /login, /refresh
      auth.service.ts          ← bcrypt, JWT sign/verify
      jwt.strategy.ts
    users/
      users.module.ts
      users.service.ts
    brands/
      brands.module.ts
      brands.controller.ts     ← CRUD + upload-url + assets/confirm
      brands.service.ts        ← issues S3 presigned URLs
    content/
      content.module.ts
      content.controller.ts    ← POST /carousel, /reel, PATCH /:id/approve-script
      content.service.ts       ← calls Claude, creates CarouselDetail/ReelDetail
    schedule/
      schedule.module.ts
      schedule.controller.ts   ← approve / reschedule / delete
      schedule.service.ts
    gateway/
      render.gateway.ts        ← Socket.io gateway (render:progress etc.)

  agent/                       ← AgentModule (autonomous scheduler)
    agent.module.ts
    agent.service.ts           ← Claude decision logic
    agent.scheduler.ts         ← @Cron every hour
    agent.producer.ts          ← dispatches delayed instagram_post jobs

  shared/
    prisma/
      prisma.module.ts
      prisma.service.ts
    redis/
      redis.module.ts          ← ioredis client
    s3/
      s3.module.ts
      s3.service.ts            ← presigned URL generation
    queues/
      render.queue.ts          ← BullMQ queue definition (render-queue)
      social.queue.ts          ← BullMQ queue definition (social-queue)
```

---

## Key Libraries

```json
{
  "@nestjs/core": "^10",
  "@nestjs/platform-express": "^10",
  "@nestjs/websockets": "^10",
  "@nestjs/schedule": "^4",
  "@nestjs/passport": "^10",
  "passport-jwt": "^4",
  "@nestjs/bullmq": "^10",
  "bullmq": "^5",
  "prisma": "^5",
  "@prisma/client": "^5",
  "ioredis": "^5",
  "@anthropic-ai/sdk": "^0.24",
  "@aws-sdk/client-s3": "^3",
  "@aws-sdk/s3-request-presigner": "^3",
  "socket.io": "^4",
  "bcrypt": "^5",
  "class-validator": "^0.14",
  "class-transformer": "^0.5"
}
```

---

## Environment Variables

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/mmcg
REDIS_URL=redis://localhost:6379
JWT_SECRET=change_me
JWT_REFRESH_SECRET=change_me_too
ANTHROPIC_API_KEY=
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=mmcg-assets
ENCRYPTION_KEY=                  # 32-byte hex for AES-256
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
INSTAGRAM_REDIRECT_URI=http://localhost:4000/instagram/callback
FRONTEND_URL=http://localhost:3000
```

---

## Script Generation (Claude)

Carousel generation calls Claude with a structured prompt:

```typescript
const response = await this.anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 2048,
  messages: [{
    role: 'user',
    content: `Generate a ${slideCount}-slide carousel about: "${topic}".
Brand tone: ${brand.tone}. Primary color: ${brand.primaryColor}.
Return JSON: { slides: [{ order, headline, body, textColor, bgColor }] }`,
  }],
});
```

Always parse and validate the JSON response before writing to `CarouselDetail.slides`. If Claude returns invalid JSON, set `ContentItem.status = failed` and return a 422.

Reel generation produces: `{ script: string, segments: Segment[] }`.

---

## BullMQ Job Dispatch

Use `@InjectQueue` from `@nestjs/bullmq`. Never import the queue directly in a controller — dispatch from the service layer only.

```typescript
// Carousel render — fire immediately
await this.renderQueue.add('carousel_render', payload, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
});

// Instagram post — delayed to scheduledAt
await this.socialQueue.add('instagram_post', payload, {
  delay: scheduledAt.getTime() - Date.now(),
  attempts: 3,
  backoff: { type: 'exponential', delay: 10000 },
});
```

---

## AgentModule

`agent.scheduler.ts` runs `@Cron(CronExpression.EVERY_HOUR)`. It:

1. Queries `ContentItem` WHERE `status = 'ready'` AND no `ScheduledPost` with status not `failed`
2. Loads mock engagement data from `./data/mock-engagement.json` (Apify scrape)
3. Calls Claude with content library + engagement data to get scheduling decisions
4. Creates `ScheduledPost` rows with `status = awaiting_approval`
5. Emits `agent:scheduled` WebSocket event for each new post

The agent **never dispatches** the `instagram_post` job — that only happens when the user approves via `PATCH /schedule/:id/approve`.

---

## Instagram Token Encryption

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Encrypt before storing
encrypt(token: string): string { /* AES-256-CBC */ }

// Decrypt before dispatching job payload
decrypt(ciphertext: string): string { /* AES-256-CBC */ }
```

Use `ENCRYPTION_KEY` env var. Never log decrypted tokens.

---

## WebSocket Progress

The worker-renderer does NOT emit WebSocket events directly — it updates `RenderJob.progress` in the DB and publishes to a Redis pub/sub channel. The backend subscribes to that channel and forwards to the Socket.io gateway.

Redis channel: `render:events` — message shape: `{ contentItemId, progress, stage, type: 'progress'|'complete'|'failed' }`

---

## Do Not

- Do not add BullMQ consumers here — this service only produces jobs
- Do not call Flux or ElevenLabs APIs here — that's the worker's job
- Do not stream large files through this service — use presigned S3 URLs
- Do not put business logic in controllers — keep controllers to input validation + delegation
- Do not share a Prisma client instance across requests without `PrismaService` singleton
