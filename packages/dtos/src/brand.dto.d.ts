import { Tone, AssetType } from '@app/types';
export declare class CreateBrandProfileDto {
    name: string;
    tone: Tone;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    logoS3Key?: string;
    isDefault?: boolean;
}
export declare class UpdateBrandProfileDto {
    name?: string;
    tone?: Tone;
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    logoS3Key?: string;
    isDefault?: boolean;
}
export declare class GetUploadUrlDto {
    type: AssetType;
}
export declare class ConfirmAssetDto {
    s3Key: string;
    filename: string;
    type: AssetType;
    mimeType: string;
    sizeBytes: number;
    durationSecs?: number;
}
