'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useRenderProgress } from '@/lib/hooks/use-render-progress';
import { CONTENT_STATUS } from '@app/constants';
import type { ContentItem } from '@/lib/api/content';
import { cn } from '@/lib/utils';

function getStatusBadge(status: string) {
  switch (status) {
    case CONTENT_STATUS.DRAFT:
    case CONTENT_STATUS.SCRIPT_PENDING:
      return (
        <Badge className="bg-secondary-text text-white border-transparent text-[11px] font-mono uppercase tracking-[1.5px]">
          {status.replace('_', ' ')}
        </Badge>
      );
    case CONTENT_STATUS.SCRIPT_APPROVED:
      return (
        <Badge
          variant="outline"
          className="border-jelly-mint text-jelly-mint bg-transparent text-[11px] font-mono uppercase tracking-[1.5px]"
        >
          Approved
        </Badge>
      );
    case CONTENT_STATUS.GENERATING:
      return (
        <Badge className="bg-jelly-mint text-black border-transparent animate-pulse text-[11px] font-mono uppercase tracking-[1.5px]">
          Generating
        </Badge>
      );
    case CONTENT_STATUS.READY:
      return (
        <Badge className="bg-jelly-mint text-black border-transparent text-[11px] font-mono uppercase tracking-[1.5px]">
          Ready
        </Badge>
      );
    case CONTENT_STATUS.PUBLISHED:
      return (
        <Badge className="bg-white text-black border-transparent text-[11px] font-mono uppercase tracking-[1.5px]">
          Published
        </Badge>
      );
    case CONTENT_STATUS.FAILED:
      return (
        <Badge className="bg-ultraviolet text-white border-transparent text-[11px] font-mono uppercase tracking-[1.5px]">
          Failed
        </Badge>
      );
    default:
      return (
        <Badge className="bg-secondary-text text-white border-transparent text-[11px] font-mono uppercase tracking-[1.5px]">
          {status}
        </Badge>
      );
  }
}

export function ContentCard({ contentItem }: { contentItem: ContentItem }) {
  const renderProgress = useRenderProgress(contentItem.id);

  return (
    <Link href={`/editor/${contentItem.id}`}>
      <div className="bg-surface-slate border border-white/10 rounded-lg overflow-hidden p-0 transition-colors group">
        {/* Thumbnail area */}
        <div className="aspect-video w-full overflow-hidden">
          {contentItem.thumbnailS3Key ? (
            <img
              src={contentItem.thumbnailS3Key}
              alt={contentItem.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full" style={{ backgroundColor: '#2d2d2d' }} />
          )}
        </div>

        {/* Content area */}
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="text-[11px] font-mono uppercase tracking-[1.5px] border-white/20 text-muted-text"
            >
              {contentItem.type}
            </Badge>
            {getStatusBadge(contentItem.status)}
          </div>

          <h3
            className={cn(
              'font-sans text-[20px] font-bold text-white transition-colors duration-150',
              'group-hover:text-deep-link-blue'
            )}
          >
            {contentItem.title}
          </h3>

          {contentItem.status === CONTENT_STATUS.GENERATING && (
            <Progress value={renderProgress.progress} className="h-1.5" />
          )}
        </div>
      </div>
    </Link>
  );
}
