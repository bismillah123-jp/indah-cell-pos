# Indah Cell POS

POS modern untuk konter HP Indah Cell: pulsa reguler, paketan/kuota internet, token PLN, aksesoris HP, jasa lem LCD/casing, isi lagu/download, kasir, inventory, analytics, transaksi, struk, dan sinkronisasi Supabase.

## Fitur Utama

- React + TypeScript + Tailwind CSS.
- Kasir cepat dengan scan SKU/barcode, kategori tabs, favorit produk, item cepat, tahan keranjang, dan checkout QRIS/tempo sekali klik.
- Form target digital untuk nomor HP atau nomor meter PLN.
- Master produk lengkap untuk barang stok, produk digital, dan jasa.
- Stok otomatis berkurang saat transaksi, plus kontrol stok cepat.
- Dashboard analytics, notifikasi stok menipis, riwayat filter tanggal/kategori/status, dan cetak ulang struk.
- Struk thermal print-ready, bisa dicetak atau disimpan sebagai PDF dari dialog print browser, plus share ke WhatsApp.
- Backup/import JSON dan mode demo lokal saat Supabase belum dikonfigurasi.

Lihat detail arsitektur di `ARCHITECTURE.md`.

## Jalan Cepat

```bash
npm install
npm run dev
```

Tanpa `.env`, aplikasi otomatis memakai mode demo lokal lewat `localStorage`, jadi semua fitur tetap bisa dicoba.

## Supabase

1. Buat project Supabase.
2. Buka SQL Editor lalu jalankan isi file `supabase/schema.sql`.
3. Salin `.env.example` menjadi `.env`.
4. Isi:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

5. Jalankan ulang `npm run dev`.

Schema sudah mengaktifkan RLS dan grant untuk `anon`/`authenticated` agar Data API bisa dipakai dari browser. Untuk produksi multi-user, ganti policy publik di `supabase/schema.sql` menjadi policy berbasis Supabase Auth.
