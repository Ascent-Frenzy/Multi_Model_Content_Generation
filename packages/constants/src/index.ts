// Queue names — import these everywhere, never hardcode strings
export const RENDER_QUEUE = 'render-queue';
export const SOCIAL_QUEUE = 'social-queue';

// Job types
export const JOB_TYPE = {
  CAROUSEL_RENDER: 'carousel_render',
  REEL_RENDER: 'reel_render',
  INSTAGRAM_POST: 'instagram_post',
} as const;

// Content status lifecycle
export const CONTENT_STATUS = {
  DRAFT: 'draft',
  SCRIPT_PENDING: 'script_pending',
  SCRIPT_APPROVED: 'script_approved',
  GENERATING: 'generating',
  READY: 'ready',
  PUBLISHED: 'published',
  FAILED: 'failed',
} as const;

export const POST_STATUS = {
  AGENT_QUEUED: 'agent_queued',
  AWAITING_APPROVAL: 'awaiting_approval',
  APPROVED: 'approved',
  POSTING: 'posting',
  POSTED: 'posted',
  FAILED: 'failed',
} as const;

// Redis channels
export const REDIS_CHANNELS = {
  RENDER_EVENTS: 'render:events',
} as const;

// Output dimensions
export const DIMENSIONS = {
  CAROUSEL: { width: 1080, height: 1080 },
  REEL: { width: 1080, height: 1920 },
} as const;

// Limits
export const LIMITS = {
  MAX_CAROUSEL_SLIDES: 10,
  MAX_REEL_DURATION_SECS: 90,
  MAX_UPLOAD_SIZE_BYTES: 500 * 1024 * 1024, // 500MB
} as const;
