import { FormEvent, useMemo, useState } from 'react';
import { Clock3, Megaphone, Plus, Trash2 } from 'lucide-react';
import type { Announcement } from '../types';

type DurationUnit = 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years' | 'forever';

type AnnouncementManagerProps = {
  announcements: Announcement[];
  saving: boolean;
  onCreate: (message: string, expiresAt: string | null) => Promise<void> | void;
  onArchive: (id: string) => Promise<void> | void;
};

const unitOptions: Array<{ value: DurationUnit; label: string; multiplier: number }> = [
  { value: 'seconds', label: 'Detik', multiplier: 1000 },
  { value: 'minutes', label: 'Menit', multiplier: 60 * 1000 },
  { value: 'hours', label: 'Jam', multiplier: 60 * 60 * 1000 },
  { value: 'days', label: 'Hari', multiplier: 24 * 60 * 60 * 1000 },
  { value: 'weeks', label: 'Minggu', multiplier: 7 * 24 * 60 * 60 * 1000 },
  { value: 'months', label: 'Bulan', multiplier: 30 * 24 * 60 * 60 * 1000 },
  { value: 'years', label: 'Tahun', multiplier: 365 * 24 * 60 * 60 * 1000 },
  { value: 'forever', label: 'Forever', multiplier: 0 },
];

const formatExpiry = (expiresAt: string | null) => {
  if (!expiresAt) return 'Forever';
  return new Date(expiresAt).toLocaleString('id-ID');
};

export const AnnouncementManager = ({ announcements, saving, onCreate, onArchive }: AnnouncementManagerProps) => {
  const [message, setMessage] = useState('');
  const [durationValue, setDurationValue] = useState(1);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('days');
  const [busyArchiveId, setBusyArchiveId] = useState('');

  const expiresAt = useMemo(() => {
    if (durationUnit === 'forever') return null;
    const selected = unitOptions.find((option) => option.value === durationUnit);
    return new Date(Date.now() + Math.max(durationValue, 1) * (selected?.multiplier ?? 0)).toISOString();
  }, [durationUnit, durationValue]);

  const submitAnnouncement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim()) return;
    await onCreate(message.trim(), expiresAt);
    setMessage('');
    setDurationValue(1);
    setDurationUnit('days');
  };

  const archive = async (id: string) => {
    setBusyArchiveId(id);
    await onArchive(id);
    setBusyArchiveId('');
  };

  return (
    <section className="panel p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-earth-500">Running Text</p>
          <h2 className="text-xl font-black text-earth-900">Pengumuman Aktif</h2>
        </div>
        <Megaphone className="text-clay-600" size={22} />
      </div>

      <form className="grid gap-3" onSubmit={submitAnnouncement}>
        <label className="field">
          Isi pengumuman
          <textarea
            className="textarea min-h-20"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Contoh: Promo casing mulai 15 ribu hari ini."
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
          <label className="field">
            Durasi
            <input
              className="input"
              inputMode="numeric"
              min={1}
              disabled={durationUnit === 'forever'}
              value={durationValue}
              onChange={(event) => setDurationValue(Number(event.target.value) || 1)}
            />
          </label>
          <label className="field">
            Satuan
            <select className="input" value={durationUnit} onChange={(event) => setDurationUnit(event.target.value as DurationUnit)}>
              {unitOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-bold text-earth-500">
            <Clock3 size={16} /> Aktif sampai {formatExpiry(expiresAt)}
          </span>
          <button className="btn-primary" disabled={saving}>
            <Plus size={17} /> {saving ? 'Menyimpan...' : 'Publikasikan'}
          </button>
        </div>
      </form>

      <div className="mt-5 grid gap-3">
        {announcements.map((announcement) => (
          <div key={announcement.id} className="rounded-2xl border border-earth-200 bg-earth-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <strong className="block text-sm text-earth-900">{announcement.message}</strong>
                <span className="mt-1 block text-xs font-bold text-earth-500">
                  Sampai {formatExpiry(announcement.expires_at)}
                </span>
              </div>
              <button
                className="icon-btn text-red-600"
                onClick={() => void archive(announcement.id)}
                disabled={busyArchiveId === announcement.id}
                title="Arsipkan"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {!announcements.length && (
          <div className="rounded-2xl border border-dashed border-earth-300 bg-earth-50 p-4 text-sm font-bold text-earth-500">
            Belum ada pengumuman aktif.
          </div>
        )}
      </div>
    </section>
  );
};
