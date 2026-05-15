import { Save, X } from 'lucide-react';
import type { Product, ProductType } from '../types';
import { toNumber } from '../utils/format';

type ProductModalProps = {
  product: Product;
  onChange: (product: Product) => void;
  onClose: () => void;
  onSave: () => void;
};

const typeOptions: Array<{ value: ProductType; label: string; category: string; unit: string }> = [
  { value: 'digital', label: 'Digital', category: 'Digital', unit: 'trx' },
  { value: 'stock', label: 'Aksesoris / Stok', category: 'Aksesoris', unit: 'pcs' },
  { value: 'service', label: 'Jasa', category: 'Jasa', unit: 'jasa' },
];

export const ProductModal = ({ product, onChange, onClose, onSave }: ProductModalProps) => (
  <div className="fixed inset-0 z-50 grid place-items-center bg-earth-900/55 p-4">
    <div className="panel w-full max-w-3xl p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-earth-500">Produk</p>
          <h2 className="text-xl font-black text-earth-900">{product.name || 'Item baru'}</h2>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Tutup modal">
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="field">
          SKU
          <input className="input" value={product.sku} onChange={(event) => onChange({ ...product, sku: event.target.value })} />
        </label>
        <label className="field">
          Nama produk
          <input className="input" value={product.name} onChange={(event) => onChange({ ...product, name: event.target.value })} />
        </label>
        <label className="field">
          Jenis
          <select
            className="input"
            value={product.type}
            onChange={(event) => {
              const option = typeOptions.find((item) => item.value === event.target.value)!;
              onChange({ ...product, type: option.value, category: option.category, unit: option.unit });
            }}
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Kategori
          <input className="input" value={product.category} onChange={(event) => onChange({ ...product, category: event.target.value })} />
        </label>
        <label className="field">
          Harga jual
          <input className="input" inputMode="numeric" value={product.price} onChange={(event) => onChange({ ...product, price: toNumber(event.target.value) })} />
        </label>
        <label className="field">
          Modal / HPP
          <input className="input" inputMode="numeric" value={product.cost} onChange={(event) => onChange({ ...product, cost: toNumber(event.target.value) })} />
        </label>
        <label className="field">
          Stok
          <input className="input" inputMode="numeric" disabled={product.type !== 'stock'} value={product.stock} onChange={(event) => onChange({ ...product, stock: toNumber(event.target.value) })} />
        </label>
        <label className="field">
          Minimum stok
          <input className="input" inputMode="numeric" disabled={product.type !== 'stock'} value={product.min_stock} onChange={(event) => onChange({ ...product, min_stock: toNumber(event.target.value) })} />
        </label>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-soft" onClick={onClose}>Batal</button>
        <button className="btn-primary" onClick={onSave}>
          <Save size={17} /> Simpan
        </button>
      </div>
    </div>
  </div>
);
