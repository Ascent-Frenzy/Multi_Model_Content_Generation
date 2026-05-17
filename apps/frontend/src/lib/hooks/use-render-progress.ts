'use client';
import { useEffect } from 'react';
import { create } from 'zustand';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketStore } from '@/lib/store/socket';
import type { RenderProgressEvent, RenderCompleteEvent, RenderFailedEvent } from '@app/types';

interface ProgressEntry {
  progress: number;
  stage: string;
  status: 'idle' | 'rendering' | 'complete' | 'failed';
  error: string | null;
}

const defaultEntry: ProgressEntry = { progress: 0, stage: '', status: 'idle', error: null };

interface RenderProgressState {
  entries: Record<string, ProgressEntry>;
  setProgress: (contentItemId: string, data: Partial<ProgressEntry>) => void;
}

const useRenderProgressStore = create<RenderProgressState>()((set) => ({
  entries: {},
  setProgress: (contentItemId, data) =>
    set((state) => ({
      entries: {
        ...state.entries,
        [contentItemId]: { ...defaultEntry, ...state.entries[contentItemId], ...data },
      },
    })),
}));

export function useRenderProgress(contentItemId: string): ProgressEntry {
  const socket = useSocketStore((s) => s.socket);
  const queryClient = useQueryClient();
  const entry = useRenderProgressStore((s) => s.entries[contentItemId] ?? defaultEntry);
  const setProgress = useRenderProgressStore((s) => s.setProgress);

  useEffect(() => {
    if (!socket) return;

    const onProgress = (event: RenderProgressEvent) => {
      if (event.contentItemId === contentItemId) {
        setProgress(contentItemId, { progress: event.progress, stage: event.stage, status: 'rendering' });
      }
    };
    const onComplete = (event: RenderCompleteEvent) => {
      if (event.contentItemId === contentItemId) {
        setProgress(contentItemId, { progress: 100, stage: 'Complete', status: 'complete', error: null });
        queryClient.invalidateQueries({ queryKey: ['content', contentItemId] });
        queryClient.invalidateQueries({ queryKey: ['content'] });
      }
    };
    const onFailed = (event: RenderFailedEvent) => {
      if (event.contentItemId === contentItemId) {
        setProgress(contentItemId, { progress: 0, stage: '', status: 'failed', error: event.error });
      }
    };

    socket.on('render:progress', onProgress);
    socket.on('render:complete', onComplete);
    socket.on('render:failed', onFailed);

    return () => {
      socket.off('render:progress', onProgress);
      socket.off('render:complete', onComplete);
      socket.off('render:failed', onFailed);
    };
  }, [socket, contentItemId, queryClient, setProgress]);

  return entry;
}
