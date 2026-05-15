import type { PaymentMethod, PaymentStatus, ProductCategory, SaleStatus } from './types';

export const APP_NAME = 'Indah Cell';

export const productTabs: Array<ProductCategory | 'Semua'> = ['Semua', 'Digital', 'Aksesoris', 'Jasa'];

export const paymentMethods: PaymentMethod[] = ['Tunai', 'QRIS', 'Transfer', 'Tempo'];

export const paymentStatuses: PaymentStatus[] = ['Lunas', 'Sebagian', 'Tempo'];

export const saleStatuses: SaleStatus[] = ['Sukses', 'Pending', 'Batal'];

export const statusTone: Record<SaleStatus, string> = {
  Sukses: 'bg-moss-100 text-moss-700',
  Pending: 'bg-amber-100 text-amber-800',
  Batal: 'bg-red-100 text-red-700',
};

export const categoryTone: Record<string, string> = {
  Digital: 'border-blue-200 bg-blue-50 text-blue-700',
  Aksesoris: 'border-earth-200 bg-earth-50 text-earth-700',
  Jasa: 'border-clay-100 bg-clay-100 text-clay-600',
  Lainnya: 'border-slate-200 bg-slate-50 text-slate-700',
};
