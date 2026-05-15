import type { ReactNode } from 'react';

type StatCardProps = {
  title: string;
  value: string;
  caption?: string;
  icon: ReactNode;
  tone?: 'earth' | 'moss' | 'clay' | 'blue' | 'red';
};

const toneMap = {
  earth: 'bg-earth-100 text-earth-800',
  moss: 'bg-moss-100 text-moss-700',
  clay: 'bg-clay-100 text-clay-600',
  blue: 'bg-blue-100 text-blue-700',
  red: 'bg-red-100 text-red-700',
};

export const StatCard = ({ title, value, caption, icon, tone = 'earth' }: StatCardProps) => (
  <div className="panel p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-normal text-earth-500">{title}</p>
        <strong className="mt-2 block text-2xl font-black text-earth-900">{value}</strong>
        {caption && <span className="mt-1 block text-xs font-semibold text-earth-500">{caption}</span>}
      </div>
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${toneMap[tone]}`}>{icon}</span>
    </div>
  </div>
);
