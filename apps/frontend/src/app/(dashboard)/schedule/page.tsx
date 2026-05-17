'use client';

import { ScheduleList } from '@/components/schedule/schedule-list';

export default function SchedulePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-sans text-[24px] font-bold">Agent Schedule</h1>
        <p className="text-secondary-text mt-1">
          AI-scheduled posts awaiting your approval
        </p>
      </div>
      <ScheduleList />
    </div>
  );
}
