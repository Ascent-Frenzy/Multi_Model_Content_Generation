'use client';

import { useState } from 'react';
import { POST_STATUS } from '@app/constants';
import type { ScheduledPost } from '@/lib/api/schedule';
import { formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ScheduleCardProps {
  post: ScheduledPost;
  onApprove: (id: string) => void;
  onReschedule: (id: string, scheduledAt: string) => void;
  onCancel: (id: string) => void;
  isApproving?: boolean;
  isRescheduling?: boolean;
  isCancelling?: boolean;
}

function getStatusBadge(status: string) {
  switch (status) {
    case POST_STATUS.AGENT_QUEUED:
      return (
        <Badge className="border-transparent bg-secondary-text text-white">
          agent_queued
        </Badge>
      );
    case POST_STATUS.AWAITING_APPROVAL:
      return (
        <Badge className="border-transparent bg-hazard-yellow text-black">
          awaiting_approval
        </Badge>
      );
    case POST_STATUS.APPROVED:
      return (
        <Badge className="border-transparent bg-jelly-mint text-black">
          approved
        </Badge>
      );
    case POST_STATUS.POSTING:
      return (
        <Badge className="border-transparent bg-jelly-mint text-black animate-pulse">
          posting
        </Badge>
      );
    case POST_STATUS.POSTED:
      return (
        <Badge className="border-transparent bg-white text-black">
          posted
        </Badge>
      );
    case POST_STATUS.FAILED:
      return (
        <Badge className="border-transparent bg-ultraviolet text-white">
          failed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function ScheduleCard({
  post,
  onApprove,
  onReschedule,
  onCancel,
  isApproving = false,
  isRescheduling = false,
  isCancelling = false,
}: ScheduleCardProps) {
  const [showReasoning, setShowReasoning] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');

  const isMutating = isApproving || isRescheduling || isCancelling;

  const handleRescheduleSubmit = () => {
    if (!rescheduleDate) return;
    onReschedule(post.id, new Date(rescheduleDate).toISOString());
    setRescheduleOpen(false);
    setRescheduleDate('');
  };

  return (
    <>
      <div className="rounded-lg border border-white/10 bg-surface-slate p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <Badge
            variant="outline"
            className="font-mono text-[11px] uppercase tracking-[1.5px]"
          >
            INSTAGRAM
          </Badge>
          {getStatusBadge(post.status)}
        </div>

        <p className="text-[13px] text-secondary-text font-sans mb-2">
          {formatDateTime(post.scheduledAt)}
        </p>

        {post.caption && (
          <p className="text-[15px] text-muted-text font-sans line-clamp-2 mb-3">
            {post.caption}
          </p>
        )}

        {post.agentReasoning && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setShowReasoning(!showReasoning)}
              className="flex items-center gap-1.5 font-mono text-[11px] uppercase text-secondary-text tracking-[1.5px] hover:text-white transition-colors"
            >
              AGENT REASONING
              {showReasoning ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {showReasoning && (
              <div className="mt-2 rounded-md bg-canvas-black p-4">
                <p className="italic font-sans text-[13px] text-secondary-text">
                  {post.agentReasoning}
                </p>
              </div>
            )}
          </div>
        )}

        {post.status === POST_STATUS.AWAITING_APPROVAL && (
          <div className="flex items-center gap-2 mt-4">
            <Button
              size="sm"
              className="bg-jelly-mint text-black rounded-xl hover:bg-jelly-mint/90"
              onClick={() => onApprove(post.id)}
              disabled={isMutating}
            >
              {isApproving ? 'Approving...' : 'Approve'}
            </Button>
            <Button
              size="sm"
              className="bg-surface-slate text-muted-text rounded-xl border border-white/10 hover:bg-white/5"
              onClick={() => setRescheduleOpen(true)}
              disabled={isMutating}
            >
              Reschedule
            </Button>
            <Button
              size="sm"
              className="bg-transparent border border-ultraviolet text-ultraviolet rounded-xl hover:bg-ultraviolet/10"
              onClick={() => onCancel(post.id)}
              disabled={isMutating}
            >
              {isCancelling ? 'Cancelling...' : 'Cancel'}
            </Button>
          </div>
        )}

        {post.status === POST_STATUS.APPROVED && (
          <div className="flex items-center gap-2 mt-4">
            <Button
              size="sm"
              className="bg-transparent border border-ultraviolet text-ultraviolet rounded-xl hover:bg-ultraviolet/10"
              onClick={() => onCancel(post.id)}
              disabled={isMutating}
            >
              {isCancelling ? 'Cancelling...' : 'Cancel'}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="bg-surface-slate border-white/10">
          <DialogHeader>
            <DialogTitle>Reschedule Post</DialogTitle>
            <DialogDescription>
              Choose a new date and time for this post.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="datetime-local"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="bg-canvas-black border-white/20 rounded-sm focus:border-jelly-mint"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRescheduleOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-jelly-mint text-black rounded-xl hover:bg-jelly-mint/90"
              onClick={handleRescheduleSubmit}
              disabled={!rescheduleDate || isRescheduling}
            >
              {isRescheduling ? 'Rescheduling...' : 'Reschedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
