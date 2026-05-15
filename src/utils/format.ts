import type { ProductType, Sale, SaleItem } from '../types';

export const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export const formatMoney = (value: number) => rupiah.format(Math.round(value || 0));

export const toNumber = (value: string | number | undefined | null) => Number(value) || 0;

export const sum = <T,>(items: T[], selector: (item: T) => number) =>
  items.reduce((total, item) => total + selector(item), 0);

export const productCategory = (type: ProductType, category?: string) => {
  if (category) return category;
  if (type === 'digital') return 'Digital';
  if (type === 'service') return 'Jasa';
  return 'Aksesoris';
};

export const digitalPlaceholder = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('pln') || lower.includes('token')) return 'Nomor meter / ID pelanggan PLN';
  if (lower.includes('lagu') || lower.includes('download')) return 'Nama pelanggan / tipe HP';
  return 'Nomor HP pelanggan';
};

export const itemTotal = (item: { price: number; quantity: number; discount: number }) =>
  Math.max(item.price * item.quantity - item.discount, 0);

export const saleCost = (sale: Sale) => sum(sale.items, (item) => item.cost * item.quantity);

export const saleProfit = (sale: Sale) => sale.total - saleCost(sale);

export const inDateRange = (dateString: string, start?: string, end?: string) => {
  const time = new Date(dateString).getTime();
  if (start) {
    const startTime = new Date(`${start}T00:00:00`).getTime();
    if (time < startTime) return false;
  }
  if (end) {
    const endTime = new Date(`${end}T23:59:59`).getTime();
    if (time > endTime) return false;
  }
  return true;
};

export const isToday = (dateString: string) => new Date(dateString).toDateString() === new Date().toDateString();

export const isThisMonth = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

export const makeInvoiceNo = (count: number) => {
  const stamp = new Date();
  const date = stamp.toISOString().slice(0, 10).replaceAll('-', '');
  const time = `${stamp.getHours()}${stamp.getMinutes()}${stamp.getSeconds()}`.padStart(6, '0');
  return `IC-${date}-${time}-${String(count + 1).padStart(4, '0')}`;
};

export const receiptText = (sale: Sale, footer: string) => {
  const itemLines = sale.items
    .map((item: SaleItem) => {
      const target = item.digital_target ? ` (${item.digital_target})` : '';
      return `${item.product_name}${target}\n${item.quantity} x ${formatMoney(item.price)} = ${formatMoney(item.line_total)}`;
    })
    .join('\n');

  return [
    'INDAH CELL',
    sale.invoice_no,
    new Date(sale.created_at).toLocaleString('id-ID'),
    `Pelanggan: ${sale.customer_name}`,
    '',
    itemLines,
    '',
    `Subtotal: ${formatMoney(sale.subtotal)}`,
    `Diskon: ${formatMoney(sale.discount)}`,
    `Total: ${formatMoney(sale.total)}`,
    `Bayar: ${formatMoney(sale.paid)}`,
    `Status: ${sale.transaction_status ?? 'Sukses'}`,
    '',
    footer,
  ].join('\n');
};
