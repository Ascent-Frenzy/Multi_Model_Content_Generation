export declare const RENDER_QUEUE = "render-queue";
export declare const SOCIAL_QUEUE = "social-queue";
export declare const JOB_TYPE: {
    readonly CAROUSEL_RENDER: "carousel_render";
    readonly REEL_RENDER: "reel_render";
    readonly INSTAGRAM_POST: "instagram_post";
};
export declare const CONTENT_STATUS: {
    readonly DRAFT: "draft";
    readonly SCRIPT_PENDING: "script_pending";
    readonly SCRIPT_APPROVED: "script_approved";
    readonly GENERATING: "generating";
    readonly READY: "ready";
    readonly PUBLISHED: "published";
    readonly FAILED: "failed";
};
export declare const POST_STATUS: {
    readonly AGENT_QUEUED: "agent_queued";
    readonly AWAITING_APPROVAL: "awaiting_approval";
    readonly APPROVED: "approved";
    readonly POSTING: "posting";
    readonly POSTED: "posted";
    readonly FAILED: "failed";
};
export declare const REDIS_CHANNELS: {
    readonly RENDER_EVENTS: "render:events";
};
export declare const DIMENSIONS: {
    readonly CAROUSEL: {
        readonly width: 1080;
        readonly height: 1080;
    };
    readonly REEL: {
        readonly width: 1080;
        readonly height: 1920;
    };
};
export declare const LIMITS: {
    readonly MAX_CAROUSEL_SLIDES: 10;
    readonly MAX_REEL_DURATION_SECS: 90;
    readonly MAX_UPLOAD_SIZE_BYTES: number;
};
