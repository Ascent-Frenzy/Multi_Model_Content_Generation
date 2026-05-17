import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AxiosError } from 'axios';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Extract a human-readable error message from an unknown error (typically AxiosError). */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    return err.response?.data?.message ?? fallback;
  }
  return fallback;
}

/**
 * Build a full asset URL from an S3 key.
 * Uses NEXT_PUBLIC_CDN_URL when set, otherwise returns the key as-is (for local dev proxies).
 */
export function assetUrl(s3Key: string | null | undefined): string {
  if (!s3Key) return '';
  const cdnBase = process.env.NEXT_PUBLIC_CDN_URL;
  if (cdnBase) {
    return `${cdnBase.replace(/\/+$/, '')}/${s3Key}`;
  }
  return s3Key;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
