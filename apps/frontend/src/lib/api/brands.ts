import { apiClient } from './client';
import type { Tone, AssetType } from '@app/types';

export interface BrandProfile {
  id: string; name: string; tone: Tone; primaryColor: string; secondaryColor: string;
  fontFamily: string; logoS3Key: string | null; isDefault: boolean; createdAt: string; updatedAt: string;
}
export interface CreateBrandInput {
  name: string; tone: Tone; primaryColor: string; secondaryColor: string; fontFamily: string;
}
export interface UpdateBrandInput extends Partial<CreateBrandInput> {
  logoS3Key?: string | null;
}
export interface BrandAsset {
  id: string; type: AssetType; s3Key: string; filename: string; mimeType: string;
  durationSecs: number | null; sizeBytes: number; createdAt: string;
}
export interface ConfirmUploadInput {
  s3Key: string; filename: string; type: AssetType; mimeType: string; sizeBytes: number;
}

export async function getBrands(): Promise<BrandProfile[]> {
  const res = await apiClient.get<BrandProfile[]>('/brands');
  return res.data;
}
export async function getBrand(id: string): Promise<BrandProfile> {
  const res = await apiClient.get<BrandProfile>(`/brands/${id}`);
  return res.data;
}
export async function createBrand(data: CreateBrandInput): Promise<BrandProfile> {
  const res = await apiClient.post<BrandProfile>('/brands', data);
  return res.data;
}
export async function updateBrand({ id, data }: { id: string; data: UpdateBrandInput }): Promise<BrandProfile> {
  const res = await apiClient.patch<BrandProfile>(`/brands/${id}`, data);
  return res.data;
}
export async function deleteBrand(id: string): Promise<void> {
  await apiClient.delete(`/brands/${id}`);
}
export async function getUploadUrl(brandId: string, type: string, filename: string): Promise<{ presignedUrl: string; s3Key: string }> {
  const res = await apiClient.get<{ presignedUrl: string; s3Key: string }>(`/brands/${brandId}/upload-url`, { params: { type, filename } });
  return res.data;
}
export async function confirmUpload(brandId: string, data: ConfirmUploadInput): Promise<BrandAsset> {
  const res = await apiClient.post<BrandAsset>(`/brands/${brandId}/assets/confirm`, data);
  return res.data;
}
export async function getBrandAssets(brandId: string): Promise<BrandAsset[]> {
  const res = await apiClient.get<BrandAsset[]>(`/brands/${brandId}/assets`);
  return res.data;
}
export async function deleteBrandAsset(brandId: string, assetId: string): Promise<void> {
  await apiClient.delete(`/brands/${brandId}/assets/${assetId}`);
}
