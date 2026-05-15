create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category text not null default 'Aksesoris',
  type text not null default 'stock' check (type in ('stock', 'digital', 'service')),
  price numeric(12, 2) not null default 0,
  cost numeric(12, 2) not null default 0,
  stock integer not null default 0,
  min_stock integer not null default 0,
  unit text not null default 'pcs',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null default 'Pelanggan Umum',
  subtotal numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  tax numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  paid numeric(12, 2) not null default 0,
  change numeric(12, 2) not null default 0,
  payment_method text not null default 'Tunai',
  payment_status text not null default 'Lunas',
  transaction_status text not null default 'Sukses' check (transaction_status in ('Sukses', 'Pending', 'Batal')),
  cashier text not null default 'Kasir',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  sku text not null default '',
  product_name text not null,
  quantity numeric(12, 2) not null default 1,
  price numeric(12, 2) not null default 0,
  cost numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null default 0,
  item_type text not null default 'stock' check (item_type in ('stock', 'digital', 'service')),
  item_category text not null default 'Aksesoris',
  digital_target text not null default '',
  notes text not null default '',
  status text not null default 'Sukses' check (status in ('Sukses', 'Pending', 'Batal')),
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'Operasional',
  amount numeric(12, 2) not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id text primary key default 'shop',
  shop_name text not null default 'Indah Cell',
  address text not null default '',
  phone text not null default '',
  cashier_name text not null default 'Kasir',
  tax_rate numeric(5, 2) not null default 0,
  receipt_footer text not null default 'Terima kasih.'
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  kind text not null default 'adjust',
  quantity integer not null default 0,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.sales
  add column if not exists transaction_status text not null default 'Sukses';

alter table public.sale_items
  add column if not exists item_category text not null default 'Aksesoris',
  add column if not exists digital_target text not null default '',
  add column if not exists notes text not null default '',
  add column if not exists status text not null default 'Sukses';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.expenses enable row level security;
alter table public.settings enable row level security;
alter table public.inventory_movements enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table
  public.products,
  public.customers,
  public.sales,
  public.sale_items,
  public.expenses,
  public.settings,
  public.inventory_movements
to anon, authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

drop policy if exists "pos public products" on public.products;
create policy "pos public products"
on public.products for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "pos public customers" on public.customers;
create policy "pos public customers"
on public.customers for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "pos public sales" on public.sales;
create policy "pos public sales"
on public.sales for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "pos public sale items" on public.sale_items;
create policy "pos public sale items"
on public.sale_items for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "pos public expenses" on public.expenses;
create policy "pos public expenses"
on public.expenses for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "pos public settings" on public.settings;
create policy "pos public settings"
on public.settings for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "pos public inventory movements" on public.inventory_movements;
create policy "pos public inventory movements"
on public.inventory_movements for all
to anon, authenticated
using (true)
with check (true);

insert into public.settings (id, shop_name, address, phone, cashier_name, tax_rate, receipt_footer)
values (
  'shop',
  'Indah Cell',
  'Jl. Raya Indah No. 12',
  '0812-3456-7890',
  'Admin',
  0,
  'Terima kasih sudah belanja di Indah Cell.'
)
on conflict (id) do nothing;

update public.settings
set
  shop_name = 'Indah Cell',
  address = 'Jl. Raya Indah No. 12',
  phone = '0812-3456-7890',
  cashier_name = 'Admin',
  receipt_footer = 'Terima kasih sudah belanja di Indah Cell.'
where id = 'shop';

insert into public.customers (name, phone, notes)
values ('Pelanggan Umum', '', '')
on conflict do nothing;

insert into public.products (sku, name, category, type, price, cost, stock, min_stock, unit)
values
  ('ACC-TG-001', 'Tempered Glass Universal', 'Aksesoris', 'stock', 25000, 10000, 24, 6, 'pcs'),
  ('ACC-SC-002', 'Softcase Silikon', 'Aksesoris', 'stock', 35000, 18000, 18, 5, 'pcs'),
  ('ACC-CH-003', 'Charger Type-C 2A', 'Aksesoris', 'stock', 45000, 28000, 12, 4, 'pcs'),
  ('ACC-KB-004', 'Kabel Data 2 Meter', 'Aksesoris', 'stock', 30000, 16000, 15, 5, 'pcs'),
  ('ACC-HS-005', 'Headset Kabel', 'Aksesoris', 'stock', 25000, 12000, 10, 4, 'pcs'),
  ('PKT-5GB', 'Kuota Internet 5GB', 'Digital', 'digital', 35000, 31000, 0, 0, 'trx'),
  ('PKT-20GB', 'Kuota Internet 20GB', 'Digital', 'digital', 92000, 86000, 0, 0, 'trx'),
  ('PUL-50K', 'Isi Pulsa 50K', 'Digital', 'digital', 53000, 50000, 0, 0, 'trx'),
  ('PLN-100K', 'Token PLN 100K', 'Digital', 'digital', 103000, 100000, 0, 0, 'trx'),
  ('SVC-LEM', 'Jasa Lem LCD / Backdoor', 'Jasa', 'service', 30000, 5000, 0, 0, 'jasa'),
  ('SVC-LAGU', 'Isi Lagu / Playlist', 'Jasa', 'service', 20000, 0, 0, 0, 'jasa'),
  ('SVC-PASANG-TG', 'Jasa Pasang Tempered', 'Jasa', 'service', 10000, 0, 0, 0, 'jasa')
on conflict (sku) do nothing;
