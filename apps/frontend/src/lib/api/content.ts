import { apiClient } from './client';
import type { ContentType, ContentStatus, CarouselSlide, ReelSegment } from '@app/types';

export interface ContentItem {
  id: string; userId: string; brandProfileId: string; type: ContentType; title: string;
  topic: string; status: ContentStatus; script: string | null; thumbnailS3Key: string | null;
  renderedS3Key: string | null; createdAt: string; updatedAt: string;
  carouselDetail?: { id: string; slideCount: number; slides: CarouselSlide[] };
  reelDetail?: { id: string; voiceoverS3Key: string | null; durationSecs: number | null; segments: ReelSegment[] };
}

export interface UpdateContentInput {
  script?: string;
  slides?: CarouselSlide[];
  segments?: ReelSegment[];
}

export async function getContentItems(): Promise<ContentItem[]> {
  const res = await apiClient.get<ContentItem[]>('/content');
  return res.data;
}
export async function getContentItem(id: string): Promise<ContentItem> {
  const res = await apiClient.get<ContentItem>(`/content/${id}`);
  return res.data;
}
export async function createCarousel(data: { topic: string; brandProfileId: string }): Promise<ContentItem> {
  const res = await apiClient.post<ContentItem>('/content/carousel', data);
  return res.data;
}
export async function createReel(data: { topic: string; brandProfileId: string }): Promise<ContentItem> {
  const res = await apiClient.post<ContentItem>('/content/reel', data);
  return res.data;
}
export async function updateContent({ id, data }: { id: string; data: UpdateContentInput }): Promise<ContentItem> {
  const res = await apiClient.patch<ContentItem>(`/content/${id}`, data);
  return res.data;
}
export async function approveScript(id: string): Promise<ContentItem> {
  const res = await apiClient.patch<ContentItem>(`/content/${id}/approve-script`);
  return res.data;
}
export async function deleteContent(id: string): Promise<void> {
  await apiClient.delete(`/content/${id}`);
}
