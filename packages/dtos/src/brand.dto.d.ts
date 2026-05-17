export declare class CreateBrandProfileDto {
    name: string;
    tone: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    logoS3Key?: string;
    isDefault?: boolean;
}
export declare class UpdateBrandProfileDto {
    name?: string;
    tone?: string;
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    logoS3Key?: string;
    isDefault?: boolean;
}
export declare class GetUploadUrlDto {
    type: string;
}
export declare class ConfirmAssetDto {
    s3Key: string;
    filename: string;
    type: string;
    mimeType: string;
    sizeBytes: number;
    durationSecs?: number;
}
