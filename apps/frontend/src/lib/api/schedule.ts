import { apiClient } from './client';
import type { Platform, PostStatus } from '@app/types';

export interface ScheduledPost {
  id: string; contentItemId: string; userId: string; platform: Platform; scheduledAt: string;
  status: PostStatus; caption: string | null; agentReasoning: string | null;
  postedAt: string | null; instagramPostId: string | null; createdAt: string;
}

export async function getScheduledPosts(): Promise<ScheduledPost[]> {
  const res = await apiClient.get<ScheduledPost[]>('/schedule');
  return res.data;
}
export async function approvePost(id: string): Promise<ScheduledPost> {
  const res = await apiClient.patch<ScheduledPost>(`/schedule/${id}/approve`);
  return res.data;
}
export async function reschedulePost({ id, data }: { id: string; data: { scheduledAt: string } }): Promise<ScheduledPost> {
  const res = await apiClient.patch<ScheduledPost>(`/schedule/${id}/reschedule`, data);
  return res.data;
}
export async function cancelPost(id: string): Promise<void> {
  await apiClient.delete(`/schedule/${id}`);
}
