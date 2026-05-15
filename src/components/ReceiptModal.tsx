import { MessageCircle, Printer, X } from 'lucide-react';
import type { Sale, ShopSettings } from '../types';
import { formatMoney, receiptText } from '../utils/format';

type ReceiptModalProps = {
  sale: Sale;
  settings: ShopSettings;
  onClose: () => void;
};

export const ReceiptModal = ({ sale, settings, onClose }: ReceiptModalProps) => {
  const waUrl = `https://wa.me/?text=${encodeURIComponent(receiptText(sale, settings.receipt_footer))}`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-earth-900/55 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-4 shadow-soft">
        <div className="no-print mb-3 flex justify-end gap-2">
          <a className="btn-soft" href={waUrl} target="_blank" rel="noreferrer">
            <MessageCircle size={17} /> WhatsApp
          </a>
          <button className="btn-primary" onClick={() => window.print()}>
            <Printer size={17} /> Cetak / PDF
          </button>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup struk">
            <X size={18} />
          </button>
        </div>

        <div className="receipt-print rounded-2xl border border-earth-200 bg-white p-5 font-mono text-[12px] text-earth-950">
          <div className="border-b border-dashed border-earth-300 pb-3 text-center">
            <h2 className="text-lg font-black">{settings.shop_name}</h2>
            <p>{settings.address}</p>
            <p>{settings.phone}</p>
          </div>

          <div className="grid gap-1 border-b border-dashed border-earth-300 py-3">
            <span>{sale.invoice_no}</span>
            <span>{new Date(sale.created_at).toLocaleString('id-ID')}</span>
            <span>Pelanggan: {sale.customer_name}</span>
            <span>Kasir: {sale.cashier}</span>
            <span>Status: {sale.transaction_status ?? 'Sukses'}</span>
          </div>

          <div className="grid gap-3 border-b border-dashed border-earth-300 py-3">
            {sale.items.map((item) => (
              <div key={item.id} className="grid gap-1">
                <div className="flex justify-between gap-3">
                  <strong>{item.product_name}</strong>
                  <strong>{formatMoney(item.line_total)}</strong>
                </div>
                <div className="flex justify-between gap-3 text-earth-600">
                  <span>
                    {item.quantity} x {formatMoney(item.price)}
                  </span>
                  <span>{item.digital_target}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-1 py-3">
            <div className="flex justify-between"><span>Subtotal</span><b>{formatMoney(sale.subtotal)}</b></div>
            <div className="flex justify-between"><span>Diskon</span><b>{formatMoney(sale.discount)}</b></div>
            <div className="flex justify-between"><span>Pajak</span><b>{formatMoney(sale.tax)}</b></div>
            <div className="mt-2 flex justify-between border-t border-dashed border-earth-300 pt-2 text-base">
              <span>Total</span><b>{formatMoney(sale.total)}</b>
            </div>
            <div className="flex justify-between"><span>Bayar</span><b>{formatMoney(sale.paid)}</b></div>
            <div className="flex justify-between"><span>Kembali</span><b>{formatMoney(sale.change)}</b></div>
          </div>

          {sale.notes && <p className="border-t border-dashed border-earth-300 pt-3">Catatan: {sale.notes}</p>}
          <p className="pt-4 text-center">{settings.receipt_footer}</p>
        </div>
      </div>
    </div>
  );
};
