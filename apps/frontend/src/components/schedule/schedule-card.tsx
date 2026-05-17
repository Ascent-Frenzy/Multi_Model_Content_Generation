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
}

function getStatusBadge(status: string) {
  switch (status) {
    case POST_STATUS.AGENT_QUEUED:
      return (
        <Badge className="border-transparent bg-[#949494] text-white">
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
        <Badge className="border-transparent bg-[#3cffd0] text-black">
          approved
        </Badge>
      );
    case POST_STATUS.POSTING:
      return (
        <Badge className="border-transparent bg-[#3cffd0] text-black animate-pulse">
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
        <Badge className="border-transparent bg-[#5200ff] text-white">
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
}: ScheduleCardProps) {
  const [showReasoning, setShowReasoning] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');

  const handleRescheduleSubmit = () => {
    if (!rescheduleDate) return;
    onReschedule(post.id, new Date(rescheduleDate).toISOString());
    setRescheduleOpen(false);
    setRescheduleDate('');
  };

  return (
    <>
      <div className="rounded-lg border border-white/10 bg-[#2d2d2d] p-[20px]">
        <div className="flex items-center justify-between gap-3 mb-3">
          <Badge
            variant="outline"
            className="font-mono text-[11px] uppercase tracking-[1.5px]"
          >
            INSTAGRAM
          </Badge>
          {getStatusBadge(post.status)}
        </div>

        <p className="text-[13px] text-[#949494] font-sans mb-2">
          {formatDateTime(post.scheduledAt)}
        </p>

        {post.caption && (
          <p className="text-[15px] text-[#e9e9e9] font-sans line-clamp-2 mb-3">
            {post.caption}
          </p>
        )}

        {post.agentReasoning && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setShowReasoning(!showReasoning)}
              className="flex items-center gap-1.5 font-mono text-[11px] uppercase text-[#949494] tracking-[1.5px] hover:text-white transition-colors"
            >
              AGENT REASONING
              {showReasoning ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {showReasoning && (
              <div className="mt-2 rounded-md bg-[#131313] p-[16px]">
                <p className="italic font-sans text-[13px] text-[#949494]">
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
              className="bg-[#3cffd0] text-black rounded-xl hover:bg-[#3cffd0]/90"
              onClick={() => onApprove(post.id)}
            >
              Approve
            </Button>
            <Button
              size="sm"
              className="bg-[#2d2d2d] text-[#e9e9e9] rounded-xl border border-white/10 hover:bg-[#3a3a3a]"
              onClick={() => setRescheduleOpen(true)}
            >
              Reschedule
            </Button>
            <Button
              size="sm"
              className="bg-transparent border border-[#5200ff] text-[#5200ff] rounded-xl hover:bg-[#5200ff]/10"
              onClick={() => onCancel(post.id)}
            >
              Cancel
            </Button>
          </div>
        )}

        {post.status === POST_STATUS.APPROVED && (
          <div className="flex items-center gap-2 mt-4">
            <Button
              size="sm"
              className="bg-transparent border border-[#5200ff] text-[#5200ff] rounded-xl hover:bg-[#5200ff]/10"
              onClick={() => onCancel(post.id)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="bg-[#2d2d2d] border-white/10">
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
              className="bg-[#131313] border-white/20 rounded-sm focus:border-[#3cffd0]"
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
              className="bg-[#3cffd0] text-black rounded-xl hover:bg-[#3cffd0]/90"
              onClick={handleRescheduleSubmit}
              disabled={!rescheduleDate}
            >
              Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
