import { ReceiptText, Wifi } from 'lucide-react';
import type { SalesPopup } from '../types';
import { formatMoney } from '../utils/format';

type SalesRealtimePopupProps = {
  popups: SalesPopup[];
};

export const SalesRealtimePopup = ({ popups }: SalesRealtimePopupProps) => {
  if (!popups.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[70] grid w-[min(24rem,calc(100vw-2rem))] gap-3 md:top-6">
      {popups.map((popup) => (
        <div key={popup.id} className="rounded-2xl border border-moss-100 bg-white/95 p-4 text-earth-900 shadow-soft backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-moss-900 text-white">
              <ReceiptText size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Wifi size={14} className="text-moss-700" />
                <p className="text-xs font-bold uppercase tracking-normal text-moss-700">Transaksi Baru</p>
              </div>
              <strong className="mt-1 block truncate text-sm font-black">{popup.invoice_no}</strong>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-earth-500">{popup.cashier}</span>
                <b className="text-moss-700">{formatMoney(popup.total)}</b>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
