"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIMITS = exports.DIMENSIONS = exports.REDIS_CHANNELS = exports.POST_STATUS = exports.CONTENT_STATUS = exports.JOB_TYPE = exports.SOCIAL_QUEUE = exports.RENDER_QUEUE = void 0;
exports.RENDER_QUEUE = 'render-queue';
exports.SOCIAL_QUEUE = 'social-queue';
exports.JOB_TYPE = {
    CAROUSEL_RENDER: 'carousel_render',
    REEL_RENDER: 'reel_render',
    INSTAGRAM_POST: 'instagram_post',
};
exports.CONTENT_STATUS = {
    DRAFT: 'draft',
    SCRIPT_PENDING: 'script_pending',
    SCRIPT_APPROVED: 'script_approved',
    GENERATING: 'generating',
    READY: 'ready',
    PUBLISHED: 'published',
    FAILED: 'failed',
};
exports.POST_STATUS = {
    AGENT_QUEUED: 'agent_queued',
    AWAITING_APPROVAL: 'awaiting_approval',
    APPROVED: 'approved',
    POSTING: 'posting',
    POSTED: 'posted',
    FAILED: 'failed',
};
exports.REDIS_CHANNELS = {
    RENDER_EVENTS: 'render:events',
};
exports.DIMENSIONS = {
    CAROUSEL: { width: 1080, height: 1080 },
    REEL: { width: 1080, height: 1920 },
};
exports.LIMITS = {
    MAX_CAROUSEL_SLIDES: 10,
    MAX_REEL_DURATION_SECS: 90,
    MAX_UPLOAD_SIZE_BYTES: 500 * 1024 * 1024,
};
//# sourceMappingURL=index.js.map