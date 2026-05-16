create extension if not exists pgcrypto;

do $$
begin
  create type public.app_role as enum ('owner', 'admin', 'kasir');
exception
  when duplicate_object then null;
end $$;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

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

-- Upgrade-safe column backfill for projects that ran an older schema.
alter table public.users_roles
  add column if not exists role public.app_role not null default 'kasir',
  add column if not exists full_name text not null default '',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users_roles'
      and column_name = 'role'
      and udt_name <> 'app_role'
  ) then
    update public.users_roles
    set role = 'kasir'
    where role::text not in ('owner', 'admin', 'kasir');

    alter table public.users_roles
      alter column role type public.app_role using role::text::public.app_role,
      alter column role set default 'kasir';
  end if;
end $$;

update public.users_roles
set
  role = coalesce(role, 'kasir'::public.app_role),
  full_name = coalesce(full_name, ''),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.users_roles
  alter column role set default 'kasir',
  alter column role set not null,
  alter column full_name set default '',
  alter column full_name set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

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

alter table public.transactions
  add column if not exists sale_id uuid references public.sales(id) on delete set null,
  add column if not exists customer_name text not null default 'Pelanggan Umum',
  add column if not exists subtotal numeric(12, 2) not null default 0,
  add column if not exists discount numeric(12, 2) not null default 0,
  add column if not exists tax numeric(12, 2) not null default 0,
  add column if not exists total numeric(12, 2) not null default 0,
  add column if not exists paid numeric(12, 2) not null default 0,
  add column if not exists change numeric(12, 2) not null default 0,
  add column if not exists payment_method text not null default 'Tunai',
  add column if not exists payment_status text not null default 'Lunas',
  add column if not exists transaction_status text not null default 'Sukses',
  add column if not exists cashier text not null default 'Kasir',
  add column if not exists notes text not null default '',
  add column if not exists items jsonb not null default '[]'::jsonb,
  add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid(),
  add column if not exists created_at timestamptz not null default now();

alter table public.announcements
  add column if not exists message text not null default '',
  add column if not exists active boolean not null default true,
  add column if not exists expires_at timestamptz,
  add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid(),
  add column if not exists created_by_role public.app_role,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

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

revoke all on function private.current_user_role() from public, anon;
grant execute on function private.current_user_role() to authenticated;

create or replace function private.guard_product_kasir_update()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if private.current_user_role() = 'kasir'::public.app_role then
    if
      new.id is distinct from old.id or
      new.sku is distinct from old.sku or
      new.name is distinct from old.name or
      new.category is distinct from old.category or
      new.type is distinct from old.type or
      new.price is distinct from old.price or
      new.cost is distinct from old.cost or
      new.min_stock is distinct from old.min_stock or
      new.unit is distinct from old.unit or
      new.active is distinct from old.active or
      new.created_at is distinct from old.created_at
    then
      raise exception 'Kasir hanya boleh mengubah stok produk saat checkout.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_product_kasir_update() from public, anon, authenticated;

drop function if exists public.checkout_sale(jsonb, jsonb, jsonb, jsonb);
create or replace function public.checkout_sale(
  p_sale jsonb,
  p_items jsonb,
  p_stock_adjustments jsonb,
  p_transaction jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  stock_item record;
  updated_count integer;
begin
  insert into public.sales (
    id,
    invoice_no,
    customer_id,
    customer_name,
    subtotal,
    discount,
    tax,
    total,
    paid,
    change,
    payment_method,
    payment_status,
    transaction_status,
    cashier,
    notes,
    created_by,
    created_at
  )
  values (
    (p_sale->>'id')::uuid,
    p_sale->>'invoice_no',
    nullif(p_sale->>'customer_id', '')::uuid,
    coalesce(p_sale->>'customer_name', 'Pelanggan Umum'),
    coalesce((p_sale->>'subtotal')::numeric, 0),
    coalesce((p_sale->>'discount')::numeric, 0),
    coalesce((p_sale->>'tax')::numeric, 0),
    coalesce((p_sale->>'total')::numeric, 0),
    coalesce((p_sale->>'paid')::numeric, 0),
    coalesce((p_sale->>'change')::numeric, 0),
    coalesce(p_sale->>'payment_method', 'Tunai'),
    coalesce(p_sale->>'payment_status', 'Lunas'),
    coalesce(p_sale->>'transaction_status', 'Sukses'),
    coalesce(p_sale->>'cashier', 'Kasir'),
    coalesce(p_sale->>'notes', ''),
    auth.uid(),
    coalesce((p_sale->>'created_at')::timestamptz, now())
  );

  insert into public.sale_items (
    id,
    sale_id,
    product_id,
    sku,
    product_name,
    quantity,
    price,
    cost,
    discount,
    line_total,
    item_type,
    item_category,
    digital_target,
    notes,
    status,
    created_at
  )
  select
    item.id,
    item.sale_id,
    item.product_id,
    item.sku,
    item.product_name,
    item.quantity,
    item.price,
    item.cost,
    item.discount,
    item.line_total,
    item.item_type,
    coalesce(item.item_category, 'Aksesoris'),
    coalesce(item.digital_target, ''),
    coalesce(item.notes, ''),
    coalesce(item.status, coalesce(p_sale->>'transaction_status', 'Sukses')),
    coalesce(item.created_at, now())
  from jsonb_to_recordset(p_items) as item (
    id uuid,
    sale_id uuid,
    product_id uuid,
    sku text,
    product_name text,
    quantity numeric,
    price numeric,
    cost numeric,
    discount numeric,
    line_total numeric,
    item_type text,
    item_category text,
    digital_target text,
    notes text,
    status text,
    created_at timestamptz
  );

  for stock_item in
    select *
    from jsonb_to_recordset(p_stock_adjustments) as item (product_id uuid, quantity integer)
  loop
    if stock_item.quantity > 0 then
      update public.products
      set stock = stock - stock_item.quantity,
          updated_at = now()
      where id = stock_item.product_id
        and stock >= stock_item.quantity;

      get diagnostics updated_count = row_count;
      if updated_count <> 1 then
        raise exception 'Stok produk tidak cukup atau produk tidak ditemukan.';
      end if;
    end if;
  end loop;

  insert into public.transactions (
    id,
    sale_id,
    invoice_no,
    customer_name,
    subtotal,
    discount,
    tax,
    total,
    paid,
    change,
    payment_method,
    payment_status,
    transaction_status,
    cashier,
    notes,
    items,
    created_by,
    created_at
  )
  values (
    (p_transaction->>'id')::uuid,
    (p_transaction->>'sale_id')::uuid,
    p_transaction->>'invoice_no',
    coalesce(p_transaction->>'customer_name', 'Pelanggan Umum'),
    coalesce((p_transaction->>'subtotal')::numeric, 0),
    coalesce((p_transaction->>'discount')::numeric, 0),
    coalesce((p_transaction->>'tax')::numeric, 0),
    coalesce((p_transaction->>'total')::numeric, 0),
    coalesce((p_transaction->>'paid')::numeric, 0),
    coalesce((p_transaction->>'change')::numeric, 0),
    coalesce(p_transaction->>'payment_method', 'Tunai'),
    coalesce(p_transaction->>'payment_status', 'Lunas'),
    coalesce(p_transaction->>'transaction_status', 'Sukses'),
    coalesce(p_transaction->>'cashier', 'Kasir'),
    coalesce(p_transaction->>'notes', ''),
    coalesce(p_transaction->'items', '[]'::jsonb),
    auth.uid(),
    coalesce((p_transaction->>'created_at')::timestamptz, now())
  );
end;
$$;

revoke all on function public.checkout_sale(jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.checkout_sale(jsonb, jsonb, jsonb, jsonb) to authenticated;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists products_guard_kasir_update on public.products;
create trigger products_guard_kasir_update
before update on public.products
for each row execute function private.guard_product_kasir_update();

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
using (private.current_user_role() in ('owner'::public.app_role, 'admin'::public.app_role, 'kasir'::public.app_role))
with check (private.current_user_role() in ('owner'::public.app_role, 'admin'::public.app_role, 'kasir'::public.app_role));

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

alter table public.products replica identity full;
alter table public.customers replica identity full;
alter table public.sales replica identity full;
alter table public.sale_items replica identity full;
alter table public.transactions replica identity full;
alter table public.announcements replica identity full;
alter table public.expenses replica identity full;
alter table public.settings replica identity full;
alter table public.inventory_movements replica identity full;
alter table public.users_roles replica identity full;

do $$
declare
  realtime_table text;
begin
  foreach realtime_table in array array[
    'products',
    'customers',
    'sales',
    'sale_items',
    'transactions',
    'announcements',
    'expenses',
    'settings',
    'inventory_movements',
    'users_roles'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', realtime_table);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;
  end loop;
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

with seed_products as (
  select *
  from jsonb_to_recordset($$[
    {"sku":"ACC-TG-001","name":"Tempered Glass Universal","category":"Aksesoris","type":"stock","price":25000,"cost":10000,"stock":24,"min_stock":6,"unit":"pcs"},
    {"sku":"ACC-SC-002","name":"Softcase Silikon","category":"Aksesoris","type":"stock","price":35000,"cost":18000,"stock":18,"min_stock":5,"unit":"pcs"},
    {"sku":"ACC-CH-003","name":"Charger Type-C 2A","category":"Aksesoris","type":"stock","price":45000,"cost":28000,"stock":12,"min_stock":4,"unit":"pcs"},
    {"sku":"ACC-KB-004","name":"Kabel Data 2 Meter","category":"Aksesoris","type":"stock","price":30000,"cost":16000,"stock":15,"min_stock":5,"unit":"pcs"},
    {"sku":"ACC-HS-005","name":"Headset Kabel","category":"Aksesoris","type":"stock","price":25000,"cost":12000,"stock":10,"min_stock":4,"unit":"pcs"},
    {"sku":"PKT-5GB","name":"Kuota Internet 5GB","category":"Digital","type":"digital","price":35000,"cost":31000,"stock":0,"min_stock":0,"unit":"trx"},
    {"sku":"PKT-20GB","name":"Kuota Internet 20GB","category":"Digital","type":"digital","price":92000,"cost":86000,"stock":0,"min_stock":0,"unit":"trx"},
    {"sku":"PUL-50K","name":"Isi Pulsa 50K","category":"Digital","type":"digital","price":53000,"cost":50000,"stock":0,"min_stock":0,"unit":"trx"},
    {"sku":"PLN-100K","name":"Token PLN 100K","category":"Digital","type":"digital","price":103000,"cost":100000,"stock":0,"min_stock":0,"unit":"trx"},
    {"sku":"SVC-LEM","name":"Jasa Lem LCD / Backdoor","category":"Jasa","type":"service","price":30000,"cost":5000,"stock":0,"min_stock":0,"unit":"jasa"},
    {"sku":"SVC-LAGU","name":"Isi Lagu / Playlist","category":"Jasa","type":"service","price":20000,"cost":0,"stock":0,"min_stock":0,"unit":"jasa"},
    {"sku":"SVC-PASANG-TG","name":"Jasa Pasang Tempered","category":"Jasa","type":"service","price":10000,"cost":0,"stock":0,"min_stock":0,"unit":"jasa"}
  ]$$::jsonb) as product (
    sku text,
    name text,
    category text,
    type text,
    price numeric,
    cost numeric,
    stock integer,
    min_stock integer,
    unit text
  )
)
insert into public.products (sku, name, category, type, price, cost, stock, min_stock, unit)
select sku, name, category, type, price, cost, stock, min_stock, unit
from seed_products
on conflict (sku) do update
set
  name = excluded.name,
  category = excluded.category,
  type = excluded.type,
  price = excluded.price,
  cost = excluded.cost,
  min_stock = excluded.min_stock,
  unit = excluded.unit,
  active = true,
  updated_at = now();

-- Bootstrap owner after creating the first Supabase Auth user:
-- insert into public.users_roles (user_id, role, full_name)
-- values ('PASTE_AUTH_USER_ID_HERE', 'owner', 'Nama Owner')
-- on conflict (user_id) do update set role = excluded.role, full_name = excluded.full_name;

notify pgrst, 'reload schema';
