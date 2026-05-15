import { formatMoney } from '../utils/format';

type Point = {
  label: string;
  value: number;
};

export const MiniBarChart = ({ points }: { points: Point[] }) => {
  const max = Math.max(...points.map((point) => point.value), 1);

  return (
    <div className="panel p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-earth-500">Grafik Pendapatan</p>
          <h2 className="text-lg font-black text-earth-900">7 hari terakhir</h2>
        </div>
        <span className="rounded-full bg-earth-100 px-3 py-1 text-xs font-bold text-earth-700">
          {formatMoney(points.reduce((total, point) => total + point.value, 0))}
        </span>
      </div>
      <div className="flex h-60 items-end gap-3">
        {points.map((point) => (
          <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-44 w-full items-end rounded-xl bg-earth-50 p-1">
              <div
                className="w-full rounded-lg bg-gradient-to-t from-earth-800 to-clay-400"
                style={{ height: `${Math.max(8, (point.value / max) * 100)}%` }}
                title={formatMoney(point.value)}
              />
            </div>
            <span className="w-full truncate text-center text-xs font-bold text-earth-500">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
