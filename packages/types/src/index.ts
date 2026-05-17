// ─── Enums ────────────────────────────────────────────────────────────────────

export type ContentType = 'carousel' | 'reel';
export type ContentStatus = 'draft' | 'script_pending' | 'script_approved' | 'generating' | 'ready' | 'published' | 'failed';
export type AssetType = 'clip' | 'image' | 'audio';
export type Tone = 'professional' | 'casual' | 'humorous' | 'inspirational';
export type Platform = 'instagram';
export type PostStatus = 'agent_queued' | 'awaiting_approval' | 'approved' | 'posting' | 'posted' | 'failed';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type SegmentType = 'clip' | 'flux_image' | 'static_image';

// ─── Slide / Segment shapes (stored as JSON in DB) ───────────────────────────

export interface CarouselSlide {
  order: number;
  headline: string;
  body: string;
  bgColor: string;
  bgImageS3Key?: string;
  overlayImageS3Key?: string;
  textColor: string;
}

export interface ReelSegment {
  order: number;
  type: SegmentType;
  assetS3Key?: string;  // for clip or static_image
  fluxPrompt?: string;  // for flux_image
  startSec: number;
  endSec: number;
  caption?: string;
}

// ─── BullMQ Job Payloads ──────────────────────────────────────────────────────

export interface CarouselRenderJob {
  jobType: 'carousel_render';
  contentItemId: string;
  brandProfileId: string;
  slides: CarouselSlide[];
  outputFormat: 'mp4' | 'png[]';
  dimensions: { width: number; height: number };
}

export interface ReelRenderJob {
  jobType: 'reel_render';
  contentItemId: string;
  brandProfileId: string;
  script: string;
  voiceId: string;
  segments: ReelSegment[];
  dimensions: { width: number; height: number };
}

export interface InstagramPostJob {
  jobType: 'instagram_post';
  scheduledPostId: string;
  contentItemId: string;
  renderedS3Key: string;
  caption: string;
  igUserId: string;
  accessToken: string; // decrypted by backend before dispatch
}

export type RenderJobPayload = CarouselRenderJob | ReelRenderJob;
export type SocialJobPayload = InstagramPostJob;

// ─── WebSocket Event Payloads ─────────────────────────────────────────────────

export interface RenderProgressEvent {
  type: 'progress';
  contentItemId: string;
  progress: number; // 0-100
  stage: string;
}

export interface RenderCompleteEvent {
  type: 'complete';
  contentItemId: string;
  renderedS3Key: string;
  thumbnailS3Key?: string;
}

export interface RenderFailedEvent {
  type: 'failed';
  contentItemId: string;
  error: string;
}

export type RenderEvent = RenderProgressEvent | RenderCompleteEvent | RenderFailedEvent;

export interface AgentScheduledEvent {
  scheduledPostId: string;
  contentItemId: string;
  scheduledAt: string; // ISO string
}
