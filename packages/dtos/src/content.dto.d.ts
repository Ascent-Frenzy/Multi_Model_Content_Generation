import { ReelSegmentDB } from '@app/types';
export declare class CreateCarouselDto {
    topic: string;
    brandProfileId: string;
    title?: string;
    slideCount?: number;
}
export declare class CreateReelDto {
    topic: string;
    brandProfileId: string;
    title?: string;
    voiceId?: string;
}
export declare class SlideUpdateDto {
    order: number;
    headline?: string;
    body?: string;
    bgColor?: string;
    textColor?: string;
    bgImageS3Key?: string;
    overlayImageS3Key?: string;
}
export declare class UpdateContentDto {
    title?: string;
    script?: string;
    slides?: SlideUpdateDto[];
    segments?: ReelSegmentDB[];
}
