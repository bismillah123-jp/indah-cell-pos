create extension if not exists pgcrypto;

do $$
begin
  create type public.app_role as enum ('owner', 'admin', 'kasir');
exception
  when duplicate_object then null;
end $$;

create schema if not exists private;

create table if not exists public.users_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'kasir',
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
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

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references public.sales(id) on delete set null,
  invoice_no text not null,
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
  items jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  active boolean not null default true,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_by_role public.app_role,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcements_message_not_empty check (length(trim(message)) > 0)
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
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.sales
  add column if not exists transaction_status text not null default 'Sukses',
  add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();

alter table public.sale_items
  add column if not exists item_category text not null default 'Aksesoris',
  add column if not exists digital_target text not null default '',
  add column if not exists notes text not null default '',
  add column if not exists status text not null default 'Sukses';

alter table public.inventory_movements
  add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.users_roles
  where user_id = auth.uid()
  limit 1
$$;

revoke all on function private.current_user_role() from public, anon, authenticated;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

drop trigger if exists users_roles_set_updated_at on public.users_roles;
create trigger users_roles_set_updated_at
before update on public.users_roles
for each row execute function public.set_updated_at();

create index if not exists products_active_category_idx on public.products (active, category);
create index if not exists sale_items_product_idx on public.sale_items (product_id);
create index if not exists sales_created_at_idx on public.sales (created_at desc);
create index if not exists transactions_created_at_idx on public.transactions (created_at desc);
create index if not exists transactions_status_idx on public.transactions (transaction_status);
create index if not exists announcements_active_expires_idx on public.announcements (active, expires_at);

alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.transactions enable row level security;
alter table public.announcements enable row level security;
alter table public.expenses enable row level security;
alter table public.settings enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.users_roles enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table
  public.products,
  public.customers,
  public.sales,
  public.sale_items,
  public.transactions,
  public.announcements,
  public.expenses,
  public.settings,
  public.inventory_movements,
  public.users_roles
to authenticated;
grant usage, select on all sequences in schema public to authenticated;

drop policy if exists "pos public products" on public.products;
drop policy if exists "pos public customers" on public.customers;
drop policy if exists "pos public sales" on public.sales;
drop policy if exists "pos public sale items" on public.sale_items;
drop policy if exists "pos public expenses" on public.expenses;
drop policy if exists "pos public settings" on public.settings;
drop policy if exists "pos public inventory movements" on public.inventory_movements;

drop policy if exists "users_roles_select" on public.users_roles;
create policy "users_roles_select"
on public.users_roles for select
to authenticated
using (
  user_id = auth.uid()
  or private.current_user_role() in ('owner'::public.app_role, 'admin'::public.app_role)
);

drop policy if exists "users_roles_owner_insert" on public.users_roles;
create policy "users_roles_owner_insert"
on public.users_roles for insert
to authenticated
with check (private.current_user_role() = 'owner'::public.app_role);

drop policy if exists "users_roles_owner_update" on public.users_roles;
create policy "users_roles_owner_update"
on public.users_roles for update
to authenticated
using (private.current_user_role() = 'owner'::public.app_role)
with check (private.current_user_role() = 'owner'::public.app_role);

drop policy if exists "users_roles_owner_delete" on public.users_roles;
create policy "users_roles_owner_delete"
on public.users_roles for delete
to authenticated
using (private.current_user_role() = 'owner'::public.app_role);

drop policy if exists "products_select_authenticated" on public.products;
create policy "products_select_authenticated"
on public.products for select
to authenticated
using (true);

drop policy if exists "products_insert_managers" on public.products;
create policy "products_insert_managers"
on public.products for insert
to authenticated
with check (private.current_user_role() in ('owner'::public.app_role, 'admin'::public.app_role));

drop policy if exists "products_update_managers" on public.products;
create policy "products_update_managers"
on public.products for update
to authenticated
using (private.current_user_role() in ('owner'::public.app_role, 'admin'::public.app_role))
with check (private.current_user_role() in ('owner'::public.app_role, 'admin'::public.app_role));

drop policy if exists "products_delete_managers" on public.products;
create policy "products_delete_managers"
on public.products for delete
to authenticated
using (private.current_user_role() in ('owner'::public.app_role, 'admin'::public.app_role));

drop policy if exists "customers_authenticated_all" on public.customers;
create policy "customers_authenticated_all"
on public.customers for all
to authenticated
using (true)
with check (true);

drop policy if exists "sales_select_role" on public.sales;
create policy "sales_select_role"
on public.sales for select
to authenticated
using (
  private.current_user_role() in ('owner'::public.app_role, 'admin'::public.app_role)
  or created_by = auth.uid()
);

drop policy if exists "sales_insert_cashier" on public.sales;
create policy "sales_insert_cashier"
on public.sales for insert
to authenticated
with check (private.current_user_role() in ('admin'::public.app_role, 'kasir'::public.app_role));

drop policy if exists "sales_update_managers" on public.sales;
create policy "sales_update_managers"
on public.sales for update
to authenticated
using (private.current_user_role() in ('owner'::public.app_role, 'admin'::public.app_role))
with check (private.current_user_role() in ('owner'::public.app_role, 'admin'::public.app_role));

drop policy if exists "sale_items_select_role" on public.sale_items;
create policy "sale_items_select_role"
on public.sale_items for select
to authenticated
using (
  private.current_user_role() in ('owner'::public.app_role, 'admin'::public.app_role)
  or exists (
    select 1
    from public.sales
    where sales.id = sale_items.sale_id
      and sales.created_by = auth.uid()
  )
);

drop policy if exists "sale_items_insert_cashier" on public.sale_items;
create policy "sale_items_insert_cashier"
on public.sale_items for insert
to authenticated
with check (private.current_user_role() in ('admin'::public.app_role, 'kasir'::public.app_role));

drop policy if exists "transactions_select_role" on public.transactions;
create policy "transactions_select_role"
on public.transactions for select
to authenticated
using (
  private.current_user_role() in ('owner'::public.app_role, 'admin'::public.app_role)
  or created_by = auth.uid()
);

drop policy if exists "transactions_insert_cashier" on public.transactions;
create policy "transactions_insert_cashier"
on public.transactions for insert
to authenticated
with check (private.current_user_role() in ('admin'::public.app_role, 'kasir'::public.app_role));

drop policy if exists "announcements_select_active" on public.announcements;
create policy "announcements_select_active"
on public.announcements for select
to authenticated
using (
  (active = true and (expires_at is null or expires_at > now()))
  or private.current_user_role() in ('owner'::public.app_role, 'admin'::public.app_role)
);

drop policy if exists "announcements_insert_managers" on public.announcements;
create policy "announcements_insert_managers"
on public.announcements for insert
to authenticated
with check (private.current_user_role() in ('owner'::public.app_role, 'admin'::public.app_role));

drop policy if exists "announcements_update_managers" on public.announcements;
create policy "announcements_update_managers"
on public.announcements for update
to authenticated
using (private.current_user_role() in ('owner'::public.app_role, 'admin'::public.app_role))
with check (private.current_user_role() in ('owner'::public.app_role, 'admin'::public.app_role));

drop policy if exists "expenses_select_authenticated" on public.expenses;
create policy "expenses_select_authenticated"
on public.expenses for select
to authenticated
using (true);

drop policy if exists "expenses_write_managers" on public.expenses;
create policy "expenses_write_managers"
on public.expenses for all
to authenticated
using (private.current_user_role() in ('owner'::public.app_role, 'admin'::public.app_role))
with check (private.current_user_role() in ('owner'::public.app_role, 'admin'::public.app_role));

drop policy if exists "settings_select_authenticated" on public.settings;
create policy "settings_select_authenticated"
on public.settings for select
to authenticated
using (true);

drop policy if exists "settings_update_managers" on public.settings;
create policy "settings_update_managers"
on public.settings for update
to authenticated
using (private.current_user_role() in ('owner'::public.app_role, 'admin'::public.app_role))
with check (private.current_user_role() in ('owner'::public.app_role, 'admin'::public.app_role));

drop policy if exists "settings_insert_managers" on public.settings;
create policy "settings_insert_managers"
on public.settings for insert
to authenticated
with check (private.current_user_role() in ('owner'::public.app_role, 'admin'::public.app_role));

drop policy if exists "inventory_movements_select_managers" on public.inventory_movements;
create policy "inventory_movements_select_managers"
on public.inventory_movements for select
to authenticated
using (private.current_user_role() in ('owner'::public.app_role, 'admin'::public.app_role));

drop policy if exists "inventory_movements_insert_managers" on public.inventory_movements;
create policy "inventory_movements_insert_managers"
on public.inventory_movements for insert
to authenticated
with check (private.current_user_role() in ('owner'::public.app_role, 'admin'::public.app_role));

alter table public.transactions replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.transactions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

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
on conflict (id) do update
set
  shop_name = excluded.shop_name,
  address = excluded.address,
  phone = excluded.phone,
  receipt_footer = excluded.receipt_footer;

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
  ('SVC-PASANG-TG', 'Jasa Pasang Tempered', 'Jasa', 'service', 10000, 0, 0, 'jasa')
on conflict (sku) do nothing;

-- Bootstrap owner after creating the first Supabase Auth user:
-- insert into public.users_roles (user_id, role, full_name)
-- values ('PASTE_AUTH_USER_ID_HERE', 'owner', 'Nama Owner')
-- on conflict (user_id) do update set role = excluded.role, full_name = excluded.full_name;
