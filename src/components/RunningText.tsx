import { Megaphone } from 'lucide-react';
import type { Announcement } from '../types';

type RunningTextProps = {
  announcements: Announcement[];
};

export const RunningText = ({ announcements }: RunningTextProps) => {
  if (!announcements.length) return null;

  const text = announcements.map((announcement) => announcement.message).join('   |   ');

  return (
    <div className="border-t border-earth-200/70 bg-moss-900 text-white">
      <div className="flex min-h-10 items-center gap-3 overflow-hidden px-4 md:px-7">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-clay-100">
          <Megaphone size={15} />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="marquee-track whitespace-nowrap text-sm font-bold">{text}</div>
        </div>
      </div>
    </div>
  );
};
