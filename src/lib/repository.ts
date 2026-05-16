import { createDefaultData, defaultSettings, seedProducts, uuid } from '../data/seed';
import { supabase } from './supabase';
import type { Announcement, AppData, Customer, Expense, Product, Sale, ShopSettings, UserRoleRecord } from '../types';

const LOCAL_KEY = 'indah-cell-pos-data-v1';
const LEGACY_LOCAL_ANNOUNCEMENTS_KEY = 'indah-cell-pos-announcements-v1';

type LoadResult = {
  data: AppData;
  source: 'supabase' | 'local';
  error?: string;
};

export const todayIso = () => new Date().toISOString();

export const normalizeNumber = (value: unknown) => Number(value ?? 0);

const isOptionalSupabaseTableError = (error: unknown, tableName: string) => {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { code?: string; message?: string };
  const message = maybeError.message?.toLowerCase() ?? '';
  return (
    maybeError.code === '42P01' ||
    maybeError.code === 'PGRST205' ||
    message.includes(tableName.toLowerCase())
  );
};

export const readLocalData = (): AppData => {
  const raw = localStorage.getItem(LOCAL_KEY);
  if (!raw) {
    const fresh = createDefaultData();
    localStorage.setItem(LOCAL_KEY, JSON.stringify(fresh));
    return fresh;
  }

  try {
    const parsed = JSON.parse(raw) as AppData;
    return {
      ...createDefaultData(),
      ...parsed,
      products: parsed.products ?? [],
      customers: parsed.customers ?? [],
      sales: parsed.sales ?? [],
      expenses: parsed.expenses ?? [],
      settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
    };
  } catch {
    const fresh = createDefaultData();
    localStorage.setItem(LOCAL_KEY, JSON.stringify(fresh));
    return fresh;
  }
};

export const writeLocalData = (data: AppData) => {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
};

export const isAnnouncementActive = (announcement: Announcement, now = new Date()) =>
  announcement.active && (!announcement.expires_at || new Date(announcement.expires_at).getTime() > now.getTime());

const clearLegacyAnnouncementCache = () => {
  localStorage.removeItem(LEGACY_LOCAL_ANNOUNCEMENTS_KEY);
};

const sanitizeProduct = (product: Product) => ({
  ...product,
  price: normalizeNumber(product.price),
  cost: normalizeNumber(product.cost),
  stock: normalizeNumber(product.stock),
  min_stock: normalizeNumber(product.min_stock),
  updated_at: todayIso(),
});

const sanitizeSale = (sale: Sale) => {
  const { items: _items, ...payload } = sale;
  return payload;
};

const loadFromSupabase = async (): Promise<AppData> => {
  const client = supabase;
  if (!client) throw new Error('Supabase belum dikonfigurasi.');

  const [productsRes, customersRes, salesRes, itemsRes, expensesRes, settingsRes] = await Promise.all([
    client.from('products').select('*').order('name', { ascending: true }),
    client.from('customers').select('*').order('created_at', { ascending: false }),
    client.from('sales').select('*').order('created_at', { ascending: false }).limit(500),
    client.from('sale_items').select('*').order('created_at', { ascending: false }).limit(5000),
    client.from('expenses').select('*').order('created_at', { ascending: false }).limit(500),
    client.from('settings').select('*').eq('id', 'shop').maybeSingle(),
  ]);

  const responses = [productsRes, customersRes, salesRes, itemsRes, expensesRes, settingsRes];
  const error = responses.find((response) => response.error)?.error;
  if (error) throw error;

  if (!productsRes.data?.length) {
    await seedRemoteData();
    return loadFromSupabase();
  }

  const saleItems = itemsRes.data ?? [];
  const sales = (salesRes.data ?? []).map((sale) => ({
      ...sale,
      transaction_status: sale.transaction_status ?? 'Sukses',
      subtotal: normalizeNumber(sale.subtotal),
    discount: normalizeNumber(sale.discount),
    tax: normalizeNumber(sale.tax),
    total: normalizeNumber(sale.total),
    paid: normalizeNumber(sale.paid),
    change: normalizeNumber(sale.change),
    items: saleItems
      .filter((item) => item.sale_id === sale.id)
      .map((item) => ({
        ...item,
        quantity: normalizeNumber(item.quantity),
        price: normalizeNumber(item.price),
        cost: normalizeNumber(item.cost),
        discount: normalizeNumber(item.discount),
        line_total: normalizeNumber(item.line_total),
        item_category: item.item_category ?? item.item_type,
        digital_target: item.digital_target ?? '',
        notes: item.notes ?? '',
        status: item.status ?? 'Sukses',
      })),
  })) as Sale[];

  return {
    products: (productsRes.data ?? []).map((product) => ({
      ...product,
      price: normalizeNumber(product.price),
      cost: normalizeNumber(product.cost),
      stock: normalizeNumber(product.stock),
      min_stock: normalizeNumber(product.min_stock),
    })) as Product[],
    customers: (customersRes.data ?? []) as Customer[],
    sales,
    expenses: (expensesRes.data ?? []).map((expense) => ({
      ...expense,
      amount: normalizeNumber(expense.amount),
    })) as Expense[],
    settings: { ...defaultSettings, ...(settingsRes.data ?? {}) } as ShopSettings,
  };
};

export const loadData = async (): Promise<LoadResult> => {
  if (!supabase) return { data: readLocalData(), source: 'local' };

  try {
    const data = await loadFromSupabase();
    writeLocalData(data);
    return { data, source: 'supabase' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Supabase gagal dimuat.';
    return { data: readLocalData(), source: 'local', error: message };
  }
};

export const loadActiveAnnouncements = async () => {
  clearLegacyAnnouncementCache();
  const client = supabase;
  if (!client) return [];

  const { data, error } = await client
    .from('announcements')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return [];

  const announcements = ((data ?? []) as Announcement[]).filter((announcement) => isAnnouncementActive(announcement));
  return announcements;
};

export const saveAnnouncement = async (announcement: Announcement) => {
  clearLegacyAnnouncementCache();
  const client = supabase;
  if (!client) throw new Error('Supabase belum dikonfigurasi.');

  const { error } = await client.from('announcements').insert(announcement);
  if (error) throw error;
};

export const archiveAnnouncement = async (id: string) => {
  clearLegacyAnnouncementCache();
  const client = supabase;
  if (!client) throw new Error('Supabase belum dikonfigurasi.');

  const { error } = await client.from('announcements').update({ active: false, updated_at: todayIso() }).eq('id', id);
  if (error) throw error;
};

export const loadBestSellerCounts = async () => {
  const client = supabase;
  if (!client) return {};

  const { data, error } = await client
    .from('transactions')
    .select('items, transaction_status')
    .neq('transaction_status', 'Batal')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) return {};

  return (data ?? []).reduce<Record<string, number>>((scores, transaction) => {
    const items = Array.isArray(transaction.items) ? transaction.items : [];
    items.forEach((item) => {
      const productId = typeof item.product_id === 'string' ? item.product_id : '';
      const quantity = normalizeNumber(item.quantity);
      if (productId) scores[productId] = (scores[productId] ?? 0) + quantity;
    });
    return scores;
  }, {});
};

export const loadUserRoles = async () => {
  const client = supabase;
  if (!client) return [];

  const { data, error } = await client
    .from('users_roles')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) return [];
  return (data ?? []) as UserRoleRecord[];
};

export const saveUserRole = async (record: UserRoleRecord) => {
  const client = supabase;
  if (!client) return;

  const { error } = await client.from('users_roles').upsert(record, { onConflict: 'user_id' });
  if (error) throw error;
};

export const deleteUserRoleRemote = async (userId: string) => {
  const client = supabase;
  if (!client) return;

  const { error } = await client.from('users_roles').delete().eq('user_id', userId);
  if (error) throw error;
};

export const saveProduct = async (product: Product) => {
  const client = supabase;
  if (!client) return;
  const payload = sanitizeProduct(product);
  const { error } = await client.from('products').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
};

export const saveCustomer = async (customer: Customer) => {
  const client = supabase;
  if (!client) return;
  const { error } = await client.from('customers').upsert(customer, { onConflict: 'id' });
  if (error) throw error;
};

export const saveExpense = async (expense: Expense) => {
  const client = supabase;
  if (!client) return;
  const { error } = await client.from('expenses').upsert(expense, { onConflict: 'id' });
  if (error) throw error;
};

export const saveSettings = async (settings: ShopSettings) => {
  const client = supabase;
  if (!client) return;
  const { error } = await client.from('settings').upsert(settings, { onConflict: 'id' });
  if (error) throw error;
};

export const deleteCustomerRemote = async (id: string) => {
  const client = supabase;
  if (!client) return;
  const { error } = await client.from('customers').delete().eq('id', id);
  if (error) throw error;
};

export const deleteExpenseRemote = async (id: string) => {
  const client = supabase;
  if (!client) return;
  const { error } = await client.from('expenses').delete().eq('id', id);
  if (error) throw error;
};

export const deleteProductRemote = async (id: string) => {
  const client = supabase;
  if (!client) return;
  const { error } = await client.from('products').delete().eq('id', id);
  if (error) throw error;
};

export const recordSale = async (sale: Sale, updatedProducts: Product[]) => {
  const client = supabase;
  if (!client) return;

  const { error: saleError } = await client.from('sales').insert(sanitizeSale(sale));
  if (saleError) throw saleError;

  const itemsPayload = sale.items.map((item) => ({ ...item, sale_id: sale.id }));
  const { error: itemsError } = await client.from('sale_items').insert(itemsPayload);
  if (itemsError) throw itemsError;

  await Promise.all(
    updatedProducts.map(async (product) => {
      const { error } = await client
        .from('products')
        .update({ stock: product.stock, updated_at: todayIso() })
        .eq('id', product.id);
      if (error) throw error;
    }),
  );

  const transactionPayload = {
    id: sale.id,
    sale_id: sale.id,
    invoice_no: sale.invoice_no,
    customer_name: sale.customer_name,
    subtotal: sale.subtotal,
    discount: sale.discount,
    tax: sale.tax,
    total: sale.total,
    paid: sale.paid,
    change: sale.change,
    payment_method: sale.payment_method,
    payment_status: sale.payment_status,
    transaction_status: sale.transaction_status ?? 'Sukses',
    cashier: sale.cashier,
    notes: sale.notes,
    items: sale.items.map((item) => ({
      product_id: item.product_id,
      sku: item.sku,
      product_name: item.product_name,
      quantity: item.quantity,
      price: item.price,
      line_total: item.line_total,
      item_type: item.item_type,
      item_category: item.item_category ?? item.item_type,
      status: item.status ?? sale.transaction_status ?? 'Sukses',
    })),
    created_at: sale.created_at,
  };

  const { error: transactionError } = await client.from('transactions').insert(transactionPayload);
  if (transactionError && !isOptionalSupabaseTableError(transactionError, 'transactions')) throw transactionError;
};

export const seedRemoteData = async () => {
  const client = supabase;
  if (!client) return;

  const products = seedProducts.map((product) => ({
    ...product,
    id: uuid(),
    created_at: todayIso(),
    updated_at: todayIso(),
  }));

  const { error: productsError } = await client.from('products').upsert(products, { onConflict: 'sku' });
  if (productsError) throw productsError;

  const { error: customerError } = await client.from('customers').upsert(
    {
      id: uuid(),
      name: 'Pelanggan Umum',
      phone: '',
      notes: '',
      created_at: todayIso(),
    },
    { onConflict: 'id' },
  );
  if (customerError) throw customerError;

  const { error: settingsError } = await client
    .from('settings')
    .upsert(defaultSettings, { onConflict: 'id' });
  if (settingsError) throw settingsError;
};

export const exportJson = (data: AppData) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  return URL.createObjectURL(blob);
};

export const resetLocalDemo = () => {
  const fresh = createDefaultData();
  writeLocalData(fresh);
  return fresh;
};
