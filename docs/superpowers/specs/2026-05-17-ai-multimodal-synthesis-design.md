# AI Multi-Modal Synthesis Platform — Design Spec

**Date:** 2026-05-17  
**Status:** Approved  
**Authors:** Syed Farzeen Ahmad

---

## Overview

A platform that lets users generate branded static (carousel) and dynamic (reel) social media content using AI, edit it in a dashboard, and autonomously schedule it to Instagram via an AI agent.

Users configure a brand profile (tone, colors, fonts, pre-uploaded clips), provide a topic, review an AI-generated script, then the platform renders final assets and an agent handles scheduling and posting.

---

## Architecture Decision

**Nx monorepo, Modular NestJS (Approach C)**

- Single repo, three apps under `apps/`, four shared packages under `packages/`
- Backend splits into `ApiModule` + `AgentModule` within one NestJS process for v1 (extractable to a separate service later)
- Worker-renderer runs two independent BullMQ queues: `render-queue` and `social-queue`
- Three developers work on separate git branches targeting their own `apps/` subdirectory

---

## Services

### Frontend — `apps/frontend` (Next.js 14, App Router)

User-facing dashboard. Responsibilities:
- Brand config setup (tone, colors, fonts, logo, asset uploads via presigned URLs)
- Carousel and reel generation wizard (topic → script review → approve)
- Canvas editor for slides and reel segments (Fabric.js)
- Content library with render status (live progress via WebSocket)
- Agent schedule view — upcoming posts, agent reasoning, approve/reschedule/delete

### Backend — `apps/backend` (NestJS)

API and orchestration layer. Responsibilities:
- REST API consumed by the frontend
- WebSocket gateway for render progress and agent events
- Generates scripts and slide/segment plans via Claude (Anthropic SDK)
- Dispatches BullMQ jobs to the render and social queues
- `AgentModule`: hourly cron that reads the content library and mock engagement data, calls Claude to decide what/when to post, creates `ScheduledPost` rows awaiting user approval
- Issues S3 presigned URLs for direct client uploads

### Worker-Renderer — `apps/worker-renderer` (NestJS + BullMQ)

Async processing layer. Responsibilities:
- `render-queue`: carousel and reel rendering jobs
  - Carousel: sharp composites each slide → FFmpeg encodes to MP4
  - Reel: ElevenLabs TTS + Flux B-roll generation (parallel) → FFmpeg stitches with voiceover and captions
- `social-queue`: delayed Instagram posting jobs
  - Decrypts access token, calls Instagram Graph API (container upload → publish)
  - Updates `ScheduledPost` status on completion or failure

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, shadcn/ui, Zustand, TanStack React Query, Fabric.js, Socket.io-client |
| Backend | NestJS, Prisma, PostgreSQL, BullMQ (producer), Redis, Passport JWT, Anthropic SDK, Socket.io, @aws-sdk/client-s3 |
| Worker-Renderer | NestJS, BullMQ (consumers), fluent-ffmpeg, fal-ai/client (Flux.1-schnell), ElevenLabs SDK, sharp, @aws-sdk/client-s3 |
| Infrastructure | PostgreSQL, Redis, AWS S3 (or Cloudflare R2), Docker Compose (local dev) |
| Shared Packages | @app/types, @app/dtos, @app/constants, @app/utils |

---

## Database Schemas (PostgreSQL via Prisma)

### User
```prisma
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  brandProfiles      BrandProfile[]
  contentItems       ContentItem[]
  scheduledPosts     ScheduledPost[]
  instagramConnection InstagramConnection?
}
```

### BrandProfile
```prisma
model BrandProfile {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id])
  name           String
  tone           Tone
  primaryColor   String   // hex
  secondaryColor String   // hex
  fontFamily     String
  logoS3Key      String?
  isDefault      Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  assets        BrandAsset[]
  contentItems  ContentItem[]
}

enum Tone {
  professional
  casual
  humorous
  inspirational
}
```

### BrandAsset
```prisma
model BrandAsset {
  id             String     @id @default(cuid())
  brandProfileId String
  brandProfile   BrandProfile @relation(fields: [brandProfileId], references: [id])
  type           AssetType
  s3Key          String
  filename       String
  mimeType       String
  durationSecs   Float?     // clips only
  sizeBytes      Int
  createdAt      DateTime   @default(now())
}

enum AssetType {
  clip
  image
  audio
}
```

### ContentItem
```prisma
model ContentItem {
  id             String        @id @default(cuid())
  userId         String
  user           User          @relation(fields: [userId], references: [id])
  brandProfileId String
  brandProfile   BrandProfile  @relation(fields: [brandProfileId], references: [id])
  type           ContentType
  title          String
  topic          String
  status         ContentStatus
  script         String?       // AI-generated narration / slide copy
  thumbnailS3Key String?
  renderedS3Key  String?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  carouselDetail CarouselDetail?
  reelDetail     ReelDetail?
  renderJobs     RenderJob[]
  scheduledPosts ScheduledPost[]
}

enum ContentType {
  carousel
  reel
}

enum ContentStatus {
  draft
  script_pending
  script_approved
  generating
  ready
  published
  failed
}
```

### CarouselDetail
```prisma
model CarouselDetail {
  id            String      @id @default(cuid())
  contentItemId String      @unique
  contentItem   ContentItem @relation(fields: [contentItemId], references: [id])
  slideCount    Int
  slides        Json        // Slide[]
  // Slide: { order: number, headline: string, body: string, bgColor: string,
  //           bgImageS3Key?: string, overlayImageS3Key?: string, textColor: string }
}
```

### ReelDetail
```prisma
model ReelDetail {
  id            String      @id @default(cuid())
  contentItemId String      @unique
  contentItem   ContentItem @relation(fields: [contentItemId], references: [id])
  voiceoverS3Key String?
  durationSecs   Float?
  segments       Json       // Segment[]
  // Segment: { order: number, type: 'clip'|'flux_image'|'static_image',
  //             assetS3Key?: string, fluxPrompt?: string,
  //             startSec: number, endSec: number, caption?: string }
}
```

### RenderJob
```prisma
model RenderJob {
  id            String    @id @default(cuid())
  contentItemId String
  contentItem   ContentItem @relation(fields: [contentItemId], references: [id])
  queue         QueueName
  jobType       JobType
  bullMqJobId   String?
  status        JobStatus
  progress      Int       @default(0)
  error         String?
  createdAt     DateTime  @default(now())
  completedAt   DateTime?
}

enum QueueName { render social }
enum JobType   { carousel_render reel_render instagram_post }
enum JobStatus { queued processing completed failed }
```

### ScheduledPost
```prisma
model ScheduledPost {
  id              String      @id @default(cuid())
  contentItemId   String
  contentItem     ContentItem @relation(fields: [contentItemId], references: [id])
  userId          String
  user            User        @relation(fields: [userId], references: [id])
  platform        Platform
  scheduledAt     DateTime
  status          PostStatus
  caption         String?
  agentReasoning  String?     // why the agent chose this content + time
  postedAt        DateTime?
  instagramPostId String?
  createdAt       DateTime    @default(now())
}

enum Platform   { instagram }
enum PostStatus { agent_queued awaiting_approval approved posting posted failed }
```

### InstagramConnection
```prisma
model InstagramConnection {
  id             String   @id @default(cuid())
  userId         String   @unique
  user           User     @relation(fields: [userId], references: [id])
  accessToken    String   // AES-256 encrypted
  igUserId       String
  igUsername     String
  tokenExpiresAt DateTime
  scopes         String[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

---

## Data Flows

### ① Asset Upload (presigned URL)
```
Frontend  → GET  /brands/:id/upload-url?type=clip
Backend   → returns { presignedUrl, s3Key }
Frontend  → PUT directly to S3 (no backend bandwidth)
Frontend  → POST /brands/:id/assets/confirm { s3Key, filename, type, mimeType, sizeBytes }
Backend   → writes BrandAsset row
```

### ② Carousel Generation
```
Frontend  → POST /content/carousel { topic, brandProfileId }
Backend   → creates ContentItem (status: script_pending)
            calls Claude → generates slides JSON → saves to CarouselDetail
            → status: script_pending (returns slides preview)
User      → reviews slides in editor, edits text/colors
            → PATCH /content/:id/approve-script
Backend   → status: script_approved
            dispatches render-queue job (carousel_render)
Worker    → sharp composites each slide (bg + shapes + text + overlay)
            → FFmpeg encodes to MP4
            → uploads to S3
            → emits WebSocket progress events
            → updates ContentItem { renderedS3Key, status: ready }
```

### ③ Reel Generation
```
Frontend  → POST /content/reel { topic, brandProfileId }
Backend   → creates ContentItem (status: script_pending)
            calls Claude → generates narration script + segment plan
            → returns script preview
User      → reviews/edits script
            → PATCH /content/:id/approve-script
Backend   → status: script_approved, dispatches render-queue job (reel_render)
Worker    → parallel: ElevenLabs TTS → voiceover.mp3 → S3
                      Flux API for flux_image segments → S3
            → FFmpeg: concat clips + overlay B-roll + sync voiceover + captions
            → uploads reel.mp4 to S3
            → emits WebSocket progress
            → updates ContentItem { renderedS3Key, status: ready }
```

### ④ Autonomous Agent → Instagram Post
```
AgentModule (cron: every hour)
  → queries ContentItems WHERE status=ready AND no pending ScheduledPost
  → loads mock engagement JSON (Apify scraped data)
  → calls Claude: "Given this content library and engagement data,
                   decide what to post and when over the next 3 days.
                   Return scheduledAt, contentItemId, caption, reasoning."
  → creates ScheduledPost rows (status: awaiting_approval)

User      → sees upcoming schedule in dashboard with agentReasoning shown
            → PATCH /schedule/:id/approve | PATCH /schedule/:id/reschedule
Backend   → dispatches delayed social-queue job (instagram_post, delay: scheduledAt)

Worker    → uses plaintext accessToken from job payload (backend decrypted before dispatch)
            → Instagram Graph API: upload media container → publish
            → updates ScheduledPost { status: posted, instagramPostId, postedAt }
```

---

## BullMQ Job Payloads

### carousel_render
```typescript
{
  jobType: 'carousel_render',
  contentItemId: string,
  brandProfileId: string,
  slides: Array<{
    order: number,
    headline: string,
    body: string,
    bgColor: string,
    bgImageS3Key?: string,
    overlayImageS3Key?: string,
    textColor: string,
  }>,
  outputFormat: 'mp4' | 'png[]',
  dimensions: { width: 1080, height: 1080 },
}
```

### reel_render
```typescript
{
  jobType: 'reel_render',
  contentItemId: string,
  brandProfileId: string,
  script: string,
  voiceId: string,       // ElevenLabs voice ID
  segments: Array<{
    order: number,
    type: 'clip' | 'flux_image' | 'static_image',
    assetS3Key?: string,
    fluxPrompt?: string,
    durationSecs: number,
  }>,
  dimensions: { width: 1080, height: 1920 }, // 9:16
}
```

### instagram_post
```typescript
{
  jobType: 'instagram_post',
  scheduledPostId: string,
  contentItemId: string,
  renderedS3Key: string,
  caption: string,
  igUserId: string,
  accessToken: string,   // decrypted by backend before dispatch
}
```

---

## REST API Endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| POST | /auth/register | Create account |
| POST | /auth/login | Returns JWT |
| POST | /auth/refresh | Refresh JWT |

### Brands
| Method | Path | Description |
|---|---|---|
| GET | /brands | List user's brand profiles |
| POST | /brands | Create brand profile |
| GET | /brands/:id | Get brand profile |
| PATCH | /brands/:id | Update brand profile |
| DELETE | /brands/:id | Delete brand profile |
| GET | /brands/:id/upload-url | Get S3 presigned upload URL |
| POST | /brands/:id/assets/confirm | Confirm upload, write BrandAsset |
| GET | /brands/:id/assets | List brand assets |
| DELETE | /brands/:id/assets/:assetId | Delete asset |

### Content
| Method | Path | Description |
|---|---|---|
| GET | /content | List content items |
| POST | /content/carousel | Start carousel generation |
| POST | /content/reel | Start reel generation |
| GET | /content/:id | Get content item + details |
| PATCH | /content/:id | Edit slides/segments |
| PATCH | /content/:id/approve-script | Approve script, trigger render |
| DELETE | /content/:id | Delete content item |

### Schedule
| Method | Path | Description |
|---|---|---|
| GET | /schedule | List scheduled posts |
| PATCH | /schedule/:id/approve | Approve agent-queued post |
| PATCH | /schedule/:id/reschedule | Change scheduledAt |
| DELETE | /schedule/:id | Cancel scheduled post |

### Instagram
| Method | Path | Description |
|---|---|---|
| GET | /instagram/auth-url | Get OAuth URL |
| GET | /instagram/callback | OAuth callback, store tokens |
| GET | /instagram/status | Connection status |
| DELETE | /instagram/disconnect | Revoke and delete tokens |

---

## WebSocket Events (Socket.io)

| Event | Direction | Payload |
|---|---|---|
| `render:progress` | Server → Client | `{ contentItemId, progress: 0-100, stage: string }` |
| `render:complete` | Server → Client | `{ contentItemId, renderedS3Key, thumbnailS3Key }` |
| `render:failed` | Server → Client | `{ contentItemId, error: string }` |
| `agent:scheduled` | Server → Client | `{ scheduledPostId, contentItemId, scheduledAt }` |

---

## Environment Variables

### Backend
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
JWT_SECRET=
JWT_REFRESH_SECRET=
ANTHROPIC_API_KEY=
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=
ENCRYPTION_KEY=                  # AES-256 key for access tokens
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
INSTAGRAM_REDIRECT_URI=
FRONTEND_URL=http://localhost:3000
```

### Worker-Renderer
```env
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://...
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=
FAL_AI_KEY=                      # fal.ai API key for Flux.1-schnell
ELEVENLABS_API_KEY=
FFMPEG_PATH=                     # optional, defaults to system ffmpeg
```

### Frontend
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

---

## Subsystem Build Order

Build in this sequence to avoid blocked dependencies:

1. **Auth & Brand Config** — users, brand profiles, asset upload (presigned URLs)
2. **Content Generation Pipeline** — script generation (Claude), carousel/reel detail models
3. **Worker Render Engine** — BullMQ consumers, FFmpeg pipeline, Flux + ElevenLabs
4. **Dashboard & Editor** — frontend canvas editor, content library, progress UI
5. **Social Media Agent** — agent cron, Instagram OAuth + posting, schedule UI
