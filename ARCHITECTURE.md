# Indah Cell POS Architecture

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Supabase Data API with remote-first writes and no browser data fallback
- Modular state management via `src/store/useCart.ts`

## Folder Structure

```txt
src/
  components/
    AppShell.tsx        # Responsive layout, sidebar, bottom nav
    MiniBarChart.tsx    # Dashboard revenue chart
    ProductModal.tsx    # Add/edit product form
    ReceiptModal.tsx    # Thermal/PDF/WhatsApp receipt
    StatCard.tsx        # Analytics cards
  data/
    seed.ts             # Indah Cell demo products/settings
  lib/
    repository.ts       # Supabase persistence layer; failures stay failed
    supabase.ts         # Supabase client setup
  store/
    useCart.ts          # Cart state management and totals
  utils/
    format.ts           # Money/date/invoice/receipt helpers
  App.tsx               # Main feature composition
  constants.ts          # Tabs, status, payment constants
  types.ts              # Domain types
```

## Database Architecture

Use `supabase-schema.sql` for the complete Auth/RBAC/Realtime schema.

Core tables:

- `products`: SKU, name, category, type, price, cost, stock, min stock, active flag.
- `customers`: customer identity and notes.
- `sales`: invoice, payment method/status, transaction status, subtotal, discount, tax, total, paid, change.
- `sale_items`: sold product snapshot, digital target, category, item status, item notes.
- `expenses`: operational expense tracking.
- `settings`: shop profile and receipt configuration.
- `inventory_movements`: future-ready stock movement audit.
- `users_roles`: RBAC mapping for owner, admin, kasir.
- `announcements`: running text with expiration.
- `transactions`: realtime sales notification and best-seller source.

Important Supabase notes:

- RLS is enabled on public tables.
- `anon` and `authenticated` are granted table access because new Supabase projects may not expose tables to the Data API automatically.
- RBAC policies protect cashier writes, owner-only role management, and manager-only operational settings.
- Realtime publication covers operational tables so clients can sync automatically without manual refresh.
- Checkout uses `public.checkout_sale(...)` RPC so sale, items, transaction log, and stock decrement commit atomically.
- The app clears legacy browser caches and does not write POS data to localStorage when Supabase is missing or failing.

## Feature Map

- Dashboard analytics: `App.tsx`, `StatCard.tsx`, `MiniBarChart.tsx`
- POS cashier: `App.tsx`, `useCart.ts`
- Digital target input: `App.tsx`, `utils/format.ts`
- Inventory CRUD: `App.tsx`, `ProductModal.tsx`, `repository.ts`
- Transaction history filters: `App.tsx`
- Receipt print/PDF/WhatsApp: `ReceiptModal.tsx`
- Supabase integration: `supabase.ts`, `repository.ts`, `supabase/schema.sql`
