# Worker-Renderer — apps/worker-renderer

**Branch:** `feature/worker-renderer`  
**Framework:** NestJS + BullMQ  
**Developer owns:** everything in `apps/worker-renderer/`

Read the root `CLAUDE.md` and the full spec first:  
`docs/superpowers/specs/2026-05-17-ai-multimodal-synthesis-design.md`

---

## Responsibility

Async processing service. Consumes BullMQ jobs from two queues. Never exposes an HTTP API (port 4001 is admin/health only). Handles all heavy computation: image compositing, video encoding, AI media generation, and Instagram posting.

---

## Module Structure

```
src/
  app.module.ts

  queues/
    render/
      render-queue.module.ts
      carousel.processor.ts    ← consumes carousel_render jobs
      reel.processor.ts        ← consumes reel_render jobs
    social/
      social-queue.module.ts
      instagram.processor.ts   ← consumes instagram_post jobs

  ffmpeg/
    ffmpeg.module.ts
    ffmpeg.service.ts          ← fluent-ffmpeg wrappers
    carousel-encoder.ts        ← slide sequence → MP4
    reel-encoder.ts            ← multi-track stitch → MP4

  flux/
    flux.module.ts
    flux.service.ts            ← fal.ai FLUX.1-schnell calls

  elevenlabs/
    elevenlabs.module.ts
    elevenlabs.service.ts      ← TTS → audio buffer → S3

  instagram/
    instagram.module.ts
    instagram.service.ts       ← Graph API: container upload → publish

  s3/
    s3.module.ts
    s3.service.ts              ← download (stream) + upload

  shared/
    prisma/                    ← same PrismaService pattern as backend
    redis/                     ← ioredis (for pub/sub progress events)
```

---

## Key Libraries

```json
{
  "@nestjs/bullmq": "^10",
  "bullmq": "^5",
  "fluent-ffmpeg": "^2",
  "@ffmpeg-installer/ffmpeg": "^1",
  "sharp": "^0.33",
  "@fal-ai/client": "^0.14",
  "elevenlabs": "^0.17",
  "@aws-sdk/client-s3": "^3",
  "ioredis": "^5",
  "prisma": "^5",
  "@prisma/client": "^5",
  "axios": "^1"
}
```

---

## Environment Variables

```env
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://user:pass@localhost:5432/mmcg
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=mmcg-assets
FAL_AI_KEY=                   # fal.ai key for FLUX.1-schnell
ELEVENLABS_API_KEY=
FFMPEG_PATH=                  # optional — defaults to @ffmpeg-installer path
```

---

## Queue Names (from @app/constants)

```typescript
import { RENDER_QUEUE, SOCIAL_QUEUE } from '@app/constants';
// RENDER_QUEUE = 'render-queue'
// SOCIAL_QUEUE = 'social-queue'
```

Always use the constants — never hardcode queue name strings.

---

## Carousel Processor

```
carousel_render job received
  → download bgImages and overlayImages from S3 to /tmp
  → for each slide:
      sharp: compose background (color fill or image) + text layer + overlay image
      → slide-N.png in /tmp
  → FFmpeg: slideshow encode (slide-N.png sequence, 3s each) → carousel.mp4
  → upload carousel.mp4 to S3 at assets/{contentItemId}/carousel.mp4
  → emit progress via Redis pub/sub at each major step
  → update ContentItem { renderedS3Key, thumbnailS3Key, status: 'ready' }
  → update RenderJob { status: 'completed', completedAt }
```

---

## Reel Processor

```
reel_render job received
  → run in parallel:
      ① ElevenLabs: TTS(script, voiceId) → voiceover.mp3 → S3
      ② for each flux_image segment: fal.ai Flux → image.png → S3
  → await both
  → download all assets (clips from S3, generated images from S3, voiceover)
  → FFmpeg complex filtergraph:
      - concat video segments (clips + still images as video tracks)
      - overlay captions (drawtext filter)
      - mix voiceover audio
      - scale to 1080x1920 (9:16)
      → reel.mp4
  → upload to S3 at assets/{contentItemId}/reel.mp4
  → emit progress + update DB same as carousel
```

---

## Progress Events

Emit to Redis pub/sub so the backend gateway can forward to Socket.io:

```typescript
await this.redis.publish('render:events', JSON.stringify({
  type: 'progress',     // or 'complete' | 'failed'
  contentItemId,
  progress: 45,         // 0-100
  stage: 'Generating B-roll with Flux',
}));
```

Emit at meaningful milestones, not every second. Suggested checkpoints:
- 5%: job started
- 20%: assets downloaded
- 40%: ElevenLabs voiceover complete (reel) / slides composited (carousel)
- 70%: Flux images complete (reel)
- 90%: FFmpeg encoding complete
- 100%: uploaded to S3

---

## Instagram Processor

```
instagram_post job fires at scheduledAt (delayed job)
  → update ScheduledPost { status: 'posting' }
  → download rendered asset from S3 to /tmp
  → Instagram Graph API:
      POST /{igUserId}/media { video_url (or image_url), caption }
      → returns creation_id
      POST /{igUserId}/media_publish { creation_id }
      → returns ig_id
  → update ScheduledPost { status: 'posted', instagramPostId: ig_id, postedAt }
  → update ContentItem { status: 'published' }
  → delete /tmp asset
```

On failure: BullMQ retries up to 3 times (exponential backoff). After all retries exhausted, update `ScheduledPost.status = 'failed'`.

---

## Temp File Management

All intermediate files go to `/tmp/{contentItemId}/`. Always clean up on job completion or failure:

```typescript
finally {
  await fs.rm(`/tmp/${contentItemId}`, { recursive: true, force: true });
}
```

Never leave orphaned files — the renderer can be memory/disk constrained.

---

## FFmpeg Notes

- Use `@ffmpeg-installer/ffmpeg` for the binary — no system dependency required
- For carousel slideshow: `ffmpeg -loop 1 -t 3 -i slide-0.png ... -filter_complex concat`
- For reel: use `lavfi` complex filtergraph for multi-track assembly
- Always set `-movflags +faststart` on output MP4s for web streaming

---

## Do Not

- Do not expose REST endpoints for rendering — all work comes through BullMQ
- Do not call the backend API from here — update the DB directly via Prisma
- Do not hold large video files in memory — stream from S3 to /tmp, process, upload
- Do not retry Flux calls inside the processor — BullMQ handles retries at the job level
- Do not emit WebSocket events directly — publish to Redis pub/sub, the backend forwards them
