/**
 * Module instantiation check — run via: node -r tsconfig-paths/register -r ts-node/register src/module-check.ts
 *
 * Verifies every @Module() in worker-renderer can be compiled by the NestJS DI
 * container without real Redis / Postgres / S3 connections.
 */
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { BullModule } from '@nestjs/bullmq';

// ── stubs (no real network/disk side-effects) ─────────────────────────────────
const asyncNoop = async () => undefined;
const noop = () => undefined;

const prismaStub = {
  $connect: asyncNoop, $disconnect: asyncNoop,
  onModuleInit: asyncNoop, onModuleDestroy: asyncNoop,
  renderJob: { updateMany: asyncNoop },
  contentItem: { update: asyncNoop },
  scheduledPost: { update: asyncNoop },
};
const redisStub  = { publish: asyncNoop, emitProgress: asyncNoop, emitComplete: asyncNoop, emitFailed: asyncNoop, onModuleDestroy: asyncNoop };
const s3Stub     = { download: asyncNoop, upload: asyncNoop, getPresignedUrl: asyncNoop, getObjectUrl: () => '' };
const ffmpegStub = { createCommand: noop, runCommand: asyncNoop, extractFrame: asyncNoop };
const carouselEncoderStub = { encode: asyncNoop };
const reelEncoderStub     = { encode: asyncNoop };
const fluxStub            = { generateImage: asyncNoop, onModuleInit: noop };
const elevenLabsStub      = { generateSpeech: asyncNoop };
const instagramStub       = { publish: asyncNoop };

// ── service + module imports ──────────────────────────────────────────────────
import { PrismaService }      from './shared/prisma/prisma.service';
import { RedisService }       from './shared/redis/redis.service';
import { S3Service }          from './s3/s3.service';
import { FfmpegService }      from './ffmpeg/ffmpeg.service';
import { CarouselEncoder }    from './ffmpeg/carousel-encoder';
import { ReelEncoder }        from './ffmpeg/reel-encoder';
import { FluxService }        from './flux/flux.service';
import { ElevenLabsService }  from './elevenlabs/elevenlabs.service';
import { InstagramService }   from './instagram/instagram.service';

import { PrismaModule }       from './shared/prisma/prisma.module';
import { RedisModule }        from './shared/redis/redis.module';
import { S3Module }           from './s3/s3.module';
import { FfmpegModule }       from './ffmpeg/ffmpeg.module';
import { FluxModule }         from './flux/flux.module';
import { ElevenLabsModule }   from './elevenlabs/elevenlabs.module';
import { InstagramModule }    from './instagram/instagram.module';
import { RenderQueueModule }  from './queues/render/render-queue.module';
import { SocialQueueModule }  from './queues/social/social-queue.module';

// ── helper ────────────────────────────────────────────────────────────────────
async function check(label: string, fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn();
    console.log('  \u2713  ' + label);
    return true;
  } catch (err: any) {
    console.error('  \u2717  ' + label);
    console.error('     ' + err.message.split('\n')[0]);
    return false;
  }
}

// ── BullModule root stub (lazyConnect so no real Redis connection is attempted)
const bullRoot = BullModule.forRoot({ connection: { host: '127.0.0.1', port: 6379, lazyConnect: true } });

// ── checks ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\nModule instantiation checks\n');
  let passed = 0, failed = 0;
  const record = (ok: boolean) => ok ? passed++ : failed++;

  record(await check('PrismaModule', async () => {
    const m = await Test.createTestingModule({ imports: [PrismaModule] })
      .overrideProvider(PrismaService).useValue(prismaStub).compile();
    await m.close();
  }));

  record(await check('RedisModule', async () => {
    const m = await Test.createTestingModule({ imports: [RedisModule] })
      .overrideProvider(RedisService).useValue(redisStub).compile();
    await m.close();
  }));

  record(await check('S3Module', async () => {
    const m = await Test.createTestingModule({ imports: [S3Module] })
      .overrideProvider(S3Service).useValue(s3Stub).compile();
    await m.close();
  }));

  record(await check('FfmpegModule', async () => {
    const m = await Test.createTestingModule({ imports: [FfmpegModule] })
      .overrideProvider(FfmpegService).useValue(ffmpegStub).compile();
    await m.close();
  }));

  record(await check('FluxModule', async () => {
    const m = await Test.createTestingModule({ imports: [FluxModule] })
      .overrideProvider(FluxService).useValue(fluxStub).compile();
    await m.close();
  }));

  record(await check('ElevenLabsModule', async () => {
    const m = await Test.createTestingModule({ imports: [ElevenLabsModule] })
      .overrideProvider(ElevenLabsService).useValue(elevenLabsStub).compile();
    await m.close();
  }));

  record(await check('InstagramModule', async () => {
    const m = await Test.createTestingModule({ imports: [InstagramModule] })
      .overrideProvider(InstagramService).useValue(instagramStub).compile();
    await m.close();
  }));

  // RenderQueueModule and SocialQueueModule use PrismaService and RedisService
  // via @Global() modules (PrismaModule, RedisModule) that are only imported at
  // the AppModule level. When testing these queue modules in isolation, we must
  // explicitly include those global modules and override their providers.
  record(await check('RenderQueueModule', async () => {
    const m = await Test.createTestingModule({
      imports: [bullRoot, PrismaModule, RedisModule, RenderQueueModule],
    })
      .overrideProvider(PrismaService).useValue(prismaStub)
      .overrideProvider(RedisService).useValue(redisStub)
      .overrideProvider(S3Service).useValue(s3Stub)
      .overrideProvider(FfmpegService).useValue(ffmpegStub)
      .overrideProvider(CarouselEncoder).useValue(carouselEncoderStub)
      .overrideProvider(ReelEncoder).useValue(reelEncoderStub)
      .overrideProvider(FluxService).useValue(fluxStub)
      .overrideProvider(ElevenLabsService).useValue(elevenLabsStub)
      .compile();
    await m.close();
  }));

  record(await check('SocialQueueModule', async () => {
    const m = await Test.createTestingModule({
      imports: [bullRoot, PrismaModule, RedisModule, SocialQueueModule],
    })
      .overrideProvider(PrismaService).useValue(prismaStub)
      .overrideProvider(RedisService).useValue(redisStub)
      .overrideProvider(S3Service).useValue(s3Stub)
      .overrideProvider(InstagramService).useValue(instagramStub)
      .compile();
    await m.close();
  }));

  console.log('\nResult: ' + passed + ' passed, ' + failed + ' failed\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error('Unexpected error:', err); process.exit(1); });
