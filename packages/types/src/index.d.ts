export type ContentType = 'carousel' | 'reel';
export type ContentStatus = 'draft' | 'script_pending' | 'script_approved' | 'generating' | 'ready' | 'published' | 'failed';
export type AssetType = 'clip' | 'image' | 'audio';
export type Tone = 'professional' | 'casual' | 'humorous' | 'inspirational';
export type Platform = 'instagram';
export type PostStatus = 'agent_queued' | 'awaiting_approval' | 'approved' | 'posting' | 'posted' | 'failed';
export type QueueName = 'render' | 'social';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type SegmentType = 'clip' | 'flux_image' | 'static_image';
export interface CarouselSlide {
    order: number;
    headline: string;
    body: string;
    bgColor: string;
    bgImageS3Key?: string;
    overlayImageS3Key?: string;
    textColor: string;
}
/** Persisted shape (DB JSON column) — uses absolute timeline positions. */
export interface ReelSegmentDB {
    order: number;
    type: SegmentType;
    assetS3Key?: string;
    fluxPrompt?: string;
    startSec: number;
    endSec: number;
    caption?: string;
}
/** Job-payload shape — backend converts DB rows before dispatching to BullMQ. */
export interface ReelSegment {
    order: number;
    type: SegmentType;
    assetS3Key?: string;
    fluxPrompt?: string;
    durationSecs: number;
    caption?: string;
}
export interface CarouselRenderJob {
    jobType: 'carousel_render';
    userId: string;
    contentItemId: string;
    brandProfileId: string;
    slides: CarouselSlide[];
    outputFormat: 'mp4' | 'png[]';
    dimensions: {
        width: number;
        height: number;
    };
}
export interface ReelRenderJob {
    jobType: 'reel_render';
    userId: string;
    contentItemId: string;
    brandProfileId: string;
    script: string;
    voiceId: string;
    segments: ReelSegment[];
    dimensions: {
        width: number;
        height: number;
    };
}
export interface InstagramPostJob {
    jobType: 'instagram_post';
    scheduledPostId: string;
    contentItemId: string;
    renderedS3Key: string;
    caption: string;
    igUserId: string;
    encryptedAccessToken: string;
}
export type RenderJobPayload = CarouselRenderJob | ReelRenderJob;
export type SocialJobPayload = InstagramPostJob;
export interface RenderProgressEvent {
    type: 'progress';
    userId: string;
    contentItemId: string;
    progress: number;
    stage: string;
}
export interface RenderCompleteEvent {
    type: 'complete';
    userId: string;
    contentItemId: string;
    renderedS3Key: string;
    thumbnailS3Key?: string;
}
export interface RenderFailedEvent {
    type: 'failed';
    userId: string;
    contentItemId: string;
    error: string;
}
export type RenderEvent = RenderProgressEvent | RenderCompleteEvent | RenderFailedEvent;
export interface AgentScheduledEvent {
    scheduledPostId: string;
    contentItemId: string;
    scheduledAt: string;
}
