'use client';

import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useScheduledPosts,
  useApprovePost,
  useReschedulePost,
  useCancelPost,
} from '@/lib/api/hooks';
import type { ScheduledPost } from '@/lib/api/schedule';
import { useSocketStore } from '@/lib/store/socket';
import { formatDate } from '@/lib/utils';
import { ScheduleCard } from './schedule-card';

export function ScheduleList() {
  const { data: posts, isLoading } = useScheduledPosts();
  const approveMutation = useApprovePost();
  const rescheduleMutation = useReschedulePost();
  const cancelMutation = useCancelPost();
  const socket = useSocketStore((s) => s.socket);
  const queryClient = useQueryClient();

  // Subscribe to agent:scheduled events to auto-refresh
  useEffect(() => {
    if (!socket) return;

    const onAgentScheduled = () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    };

    socket.on('agent:scheduled', onAgentScheduled);

    return () => {
      socket.off('agent:scheduled', onAgentScheduled);
    };
  }, [socket, queryClient]);

  // Group posts by date
  const groupedPosts = useMemo(() => {
    if (!posts) return {};
    return posts.reduce<Record<string, ScheduledPost[]>>((groups, post) => {
      const dateKey = formatDate(post.scheduledAt);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(post);
      return groups;
    }, {});
  }, [posts]);

  const handleApprove = (id: string) => {
    approveMutation.mutate(id);
  };

  const handleReschedule = (id: string, scheduledAt: string) => {
    rescheduleMutation.mutate({ id, data: { scheduledAt } });
  };

  const handleCancel = (id: string) => {
    cancelMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-40 rounded-lg bg-surface-slate animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-secondary-text text-[15px]">
          No upcoming posts. The AI agent will schedule posts when content is
          ready.
        </p>
      </div>
    );
  }

  const dateKeys = Object.keys(groupedPosts);

  return (
    <div className="space-y-8">
      {dateKeys.map((dateKey) => (
        <div key={dateKey}>
          <h3
            className="font-mono text-[12px] uppercase text-secondary-text tracking-[1.5px] mb-4"
          >
            {dateKey}
          </h3>
          <div className="space-y-4">
            {groupedPosts[dateKey].map((post) => (
              <ScheduleCard
                key={post.id}
                post={post}
                onApprove={handleApprove}
                onReschedule={handleReschedule}
                onCancel={handleCancel}
                isApproving={approveMutation.isPending}
                isRescheduling={rescheduleMutation.isPending}
                isCancelling={cancelMutation.isPending}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
