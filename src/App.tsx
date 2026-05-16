import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Boxes,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  Edit3,
  FileText,
  PackagePlus,
  Plus,
  QrCode,
  ReceiptText,
  Save,
  Search,
  ShoppingCart,
  Smartphone,
  Trash2,
  TrendingUp,
  Upload,
  WalletCards,
  X,
} from 'lucide-react';
import { AnnouncementManager } from './components/AnnouncementManager';
import { AppShell, type AppView } from './components/AppShell';
import { LoginPage } from './components/LoginPage';
import { MiniBarChart } from './components/MiniBarChart';
import { ProductModal } from './components/ProductModal';
import { ReceiptModal } from './components/ReceiptModal';
import { RoleManager } from './components/RoleManager';
import { SalesRealtimePopup } from './components/SalesRealtimePopup';
import { StatCard } from './components/StatCard';
import { paymentMethods, productTabs, saleStatuses, statusTone } from './constants';
import { createDefaultData, uuid } from './data/seed';
import { useAuthRole } from './hooks/useAuthRole';
import {
  archiveAnnouncement,
  deleteUserRoleRemote,
  deleteProductRemote,
  exportJson,
  isAnnouncementActive,
  loadActiveAnnouncements,
  loadBestSellerCounts,
  loadData,
  loadUserRoles,
  recordSale,
  resetLocalDemo,
  saveAnnouncement,
  saveProduct,
  saveSettings,
  saveUserRole,
  todayIso,
  writeLocalData,
} from './lib/repository';
import { hasSupabaseConfig, supabase } from './lib/supabase';
import { useCart } from './store/useCart';
import type {
  Announcement,
  AppData,
  CartItem,
  PaymentMethod,
  PaymentStatus,
  Product,
  ProductCategory,
  Sale,
  SaleItem,
  SaleStatus,
  SalesPopup,
  ShopSettings,
  UserRole,
  UserRoleRecord,
} from './types';
import {
  digitalPlaceholder,
  formatMoney,
  inDateRange,
  isThisMonth,
  isToday,
  itemTotal,
  makeInvoiceNo,
  productCategory,
  saleCost,
  saleProfit,
  sum,
  toNumber,
} from './utils/format';

type HeldCart = {
  id: string;
  label: string;
  items: CartItem[];
  discount: number;
  notes: string;
  created_at: string;
};

type TransactionRealtimeRow = {
  id?: string;
  invoice_no?: string;
  total?: number | string | null;
  cashier?: string | null;
  items?: unknown;
  created_at?: string | null;
};

const roleViews: Record<UserRole, AppView[]> = {
  owner: ['dashboard', 'inventory', 'transactions', 'settings'],
  admin: ['cashier', 'inventory', 'transactions', 'settings'],
  kasir: ['cashier'],
};

const managerRoles: UserRole[] = ['owner', 'admin'];

const calculateBestSellerCounts = (sales: Sale[]) =>
  sales.reduce<Record<string, number>>((scores, sale) => {
    if ((sale.transaction_status ?? 'Sukses') === 'Batal') return scores;
    sale.items.forEach((item) => {
      if (!item.product_id) return;
      scores[item.product_id] = (scores[item.product_id] ?? 0) + item.quantity;
    });
    return scores;
  }, {});

const parseTransactionItems = (items: unknown): Array<{ product_id?: string | null; quantity?: number | string | null }> => {
  if (Array.isArray(items)) return items as Array<{ product_id?: string | null; quantity?: number | string | null }>;
  if (typeof items !== 'string') return [];

  try {
    const parsed = JSON.parse(items);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const countTransactionItems = (items: unknown) =>
  parseTransactionItems(items).reduce<Record<string, number>>((scores, item) => {
    if (!item.product_id) return scores;
    scores[item.product_id] = (scores[item.product_id] ?? 0) + toNumber(item.quantity ?? 0);
    return scores;
  }, {});

const emptyProduct = (): Product => ({
  id: uuid(),
  sku: '',
  name: '',
  category: 'Aksesoris',
  type: 'stock',
  price: 0,
  cost: 0,
  stock: 0,
  min_stock: 0,
  unit: 'pcs',
  active: true,
  created_at: todayIso(),
  updated_at: todayIso(),
});

const App = () => {
  const [data, setData] = useState<AppData>(() => createDefaultData());
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const auth = useAuthRole();
  const appRole = auth.role ?? 'kasir';
  const allowedViews = useMemo(() => roleViews[appRole] ?? roleViews.kasir, [appRole]);
  const currentView = allowedViews.includes(activeView) ? activeView : allowedViews[0];
  const canManageOperations = managerRoles.includes(appRole);
  const canViewFinancialReports = appRole === 'owner';
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState<{ source: 'supabase' | 'local'; error?: string }>({ source: 'local' });
  const [toast, setToast] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementNow, setAnnouncementNow] = useState(() => Date.now());
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [userRoles, setUserRoles] = useState<UserRoleRecord[]>([]);
  const [savingRole, setSavingRole] = useState(false);
  const [bestSellerCounts, setBestSellerCounts] = useState<Record<string, number>>({});
  const [salesPopups, setSalesPopups] = useState<SalesPopup[]>([]);

  const [activeProductTab, setActiveProductTab] = useState<ProductCategory | 'Semua'>('Semua');
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tunai');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Lunas');
  const [transactionStatus, setTransactionStatus] = useState<SaleStatus>('Sukses');
  const [paidAmount, setPaidAmount] = useState(0);
  const [quickName, setQuickName] = useState('');
  const [quickPrice, setQuickPrice] = useState('');
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);

  const [productDraft, setProductDraft] = useState<Product | null>(null);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<ShopSettings>(data.settings);
  const [historyStart, setHistoryStart] = useState('');
  const [historyEnd, setHistoryEnd] = useState('');
  const [historyCategory, setHistoryCategory] = useState<ProductCategory | 'Semua'>('Semua');
  const [historyStatus, setHistoryStatus] = useState<SaleStatus | 'Semua'>('Semua');

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const popupTimersRef = useRef<number[]>([]);
  const realtimeSyncTimerRef = useRef<number | null>(null);
  const countedTransactionIdsRef = useRef<Set<string>>(new Set());
  const cart = useCart(data.products, data.settings.tax_rate);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }, []);

  const commitData = (next: AppData) => {
    setData(next);
    writeLocalData(next);
  };

  const refreshBestSellerCounts = useCallback(async (sales: Sale[]) => {
    const localCounts = calculateBestSellerCounts(sales);
    setBestSellerCounts(localCounts);

    if (!supabase) return;

    const remoteCounts = await loadBestSellerCounts();
    if (Object.keys(remoteCounts).length) setBestSellerCounts(remoteCounts);
  }, []);

  const syncRemoteState = useCallback(async (showSuccess = false) => {
    const [result, activeAnnouncements, roles] = await Promise.all([
      loadData(),
      loadActiveAnnouncements(),
      loadUserRoles(),
    ]);
    setData(result.data);
    setSettingsDraft(result.data.settings);
    setConnection({ source: result.source, error: result.error });
    setSelectedCustomerId(result.data.customers[0]?.id ?? '');
    setAnnouncements(activeAnnouncements.filter((announcement) => isAnnouncementActive(announcement)));
    setUserRoles(roles);
    await refreshBestSellerCounts(result.data.sales);
    if (showSuccess) showToast('Data dimuat ulang.');
  }, [refreshBestSellerCounts, showToast]);

  const refreshData = async () => {
    await syncRemoteState(true);
  };

  useEffect(() => {
    if (auth.loading) return;
    if (hasSupabaseConfig && !auth.session) {
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);

    syncRemoteState()
      .then(() => {
        if (!alive) return;
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [auth.loading, auth.session?.user.id, syncRemoteState]);

  useEffect(() => {
    if (activeView !== currentView) setActiveView(currentView);
  }, [activeView, currentView]);

  useEffect(() => {
    if (currentView === 'cashier' && !loading) {
      window.setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [currentView, loading]);

  useEffect(() => {
    const timer = window.setInterval(() => setAnnouncementNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const productSorter = useCallback(
    (a: Product, b: Product) =>
      (bestSellerCounts[b.id] ?? 0) - (bestSellerCounts[a.id] ?? 0) ||
      a.category.localeCompare(b.category) ||
      a.name.localeCompare(b.name),
    [bestSellerCounts],
  );

  const activeAnnouncements = useMemo(
    () => announcements.filter((announcement) => isAnnouncementActive(announcement, new Date(announcementNow))),
    [announcementNow, announcements],
  );

  const products = useMemo(
    () =>
      data.products
        .filter((product) => product.active)
        .filter((product) => activeProductTab === 'Semua' || productCategory(product.type, product.category) === activeProductTab)
        .filter((product) => {
          const term = search.trim().toLowerCase();
          if (!term) return true;
          return [product.name, product.sku, product.category].some((value) => value.toLowerCase().includes(term));
        })
        .sort(productSorter),
    [activeProductTab, data.products, productSorter, search],
  );

  const lowStock = useMemo(
    () =>
      data.products.filter(
        (product) => product.active && product.type === 'stock' && product.stock <= product.min_stock,
      ),
    [data.products],
  );

  const todaySales = useMemo(() => data.sales.filter((sale) => isToday(sale.created_at)), [data.sales]);
  const monthSales = useMemo(() => data.sales.filter((sale) => isThisMonth(sale.created_at)), [data.sales]);
  const receivables = useMemo(() => sum(data.sales, (sale) => Math.max(sale.total - sale.paid, 0)), [data.sales]);
  const favoriteProducts = useMemo(
    () => data.products.filter((item) => item.active).sort(productSorter).slice(0, 8),
    [data.products, productSorter],
  );

  const chartPoints = useMemo(() => {
    const points = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        label: date.toLocaleDateString('id-ID', { weekday: 'short' }),
        value: sum(
          data.sales.filter((sale) => sale.created_at.slice(0, 10) === key),
          (sale) => sale.total,
        ),
      };
    });
    return points;
  }, [data.sales]);

  const filteredSales = useMemo(() => {
    return data.sales.filter((sale) => {
      if (!inDateRange(sale.created_at, historyStart, historyEnd)) return false;
      if (historyStatus !== 'Semua' && (sale.transaction_status ?? 'Sukses') !== historyStatus) return false;
      if (historyCategory === 'Semua') return true;
      return sale.items.some((item) => (item.item_category ?? productCategory(item.item_type)) === historyCategory);
    });
  }, [data.sales, historyCategory, historyEnd, historyStart, historyStatus]);

  const mergeBestSellerCounts = useCallback((counts: Record<string, number>) => {
    setBestSellerCounts((current) => {
      const next = { ...current };
      Object.entries(counts).forEach(([productId, quantity]) => {
        next[productId] = (next[productId] ?? 0) + quantity;
      });
      return next;
    });
  }, []);

  const pushSalesPopup = useCallback((row: TransactionRealtimeRow) => {
    const popupId = uuid();
    const popup: SalesPopup = {
      id: popupId,
      invoice_no: row.invoice_no ?? 'Transaksi baru',
      total: toNumber(row.total ?? 0),
      cashier: row.cashier ?? 'Kasir',
      created_at: row.created_at ?? todayIso(),
    };

    setSalesPopups((current) => [popup, ...current].slice(0, 4));

    const timer = window.setTimeout(() => {
      setSalesPopups((current) => current.filter((item) => item.id !== popupId));
    }, 30000);
    popupTimersRef.current.push(timer);
  }, []);

  const scheduleRealtimeSync = useCallback(() => {
    if (realtimeSyncTimerRef.current) window.clearTimeout(realtimeSyncTimerRef.current);
    realtimeSyncTimerRef.current = window.setTimeout(() => {
      realtimeSyncTimerRef.current = null;
      void syncRemoteState(false);
    }, 450);
  }, [syncRemoteState]);

  useEffect(() => {
    return () => {
      popupTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      if (realtimeSyncTimerRef.current) window.clearTimeout(realtimeSyncTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client || !auth.session) return;

    const realtimeTables = [
      'products',
      'settings',
      'announcements',
      'sales',
      'sale_items',
      'transactions',
      'users_roles',
    ];

    let channel = client.channel('indah-cell-live-sync');
    realtimeTables.forEach((table) => {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        const isInsert = 'eventType' in payload && payload.eventType === 'INSERT';
        const row = payload.new as TransactionRealtimeRow;
        if (table === 'transactions' && isInsert && managerRoles.includes(appRole)) {
          pushSalesPopup(row);
        }
        if (table === 'transactions' && isInsert && (!row.id || !countedTransactionIdsRef.current.has(row.id))) {
          if (row.id) countedTransactionIdsRef.current.add(row.id);
          mergeBestSellerCounts(countTransactionItems(row.items));
        }
        scheduleRealtimeSync();
      });
    });

    channel.subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [appRole, auth.session, mergeBestSellerCounts, pushSalesPopup, scheduleRealtimeSync]);

  const handleProductClick = (product: Product) => {
    if (product.type === 'stock' && product.stock <= 0) {
      showToast('Stok produk ini habis.');
      return;
    }
    cart.addProduct(product);
  };

  const handleSearchKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    const term = search.trim().toLowerCase();
    const exact = data.products.find((product) => product.active && product.sku.toLowerCase() === term);
    const product = exact ?? (products.length === 1 ? products[0] : undefined);
    if (product) {
      handleProductClick(product);
      setSearch('');
    }
  };

  const addQuickItem = () => {
    const price = toNumber(quickPrice);
    const name = quickName.trim();
    if (!name || price <= 0) {
      showToast('Isi nama dan harga item cepat.');
      return;
    }
    cart.addCustomItem(name, price);
    setQuickName('');
    setQuickPrice('');
  };

  const holdCart = () => {
    if (!cart.items.length) {
      showToast('Keranjang masih kosong.');
      return;
    }
    setHeldCarts((current) =>
      [
        {
          id: uuid(),
          label: `Antrian ${current.length + 1}`,
          items: cart.items,
          discount: cart.discount,
          notes: cart.notes,
          created_at: todayIso(),
        },
        ...current,
      ].slice(0, 6),
    );
    cart.clear();
    setPaidAmount(0);
    showToast('Keranjang ditahan.');
  };

  const restoreHeldCart = (id: string) => {
    const held = heldCarts.find((item) => item.id === id);
    if (!held) return;
    cart.setHeldCart(held.items, held.discount, held.notes);
    setHeldCarts((current) => current.filter((item) => item.id !== id));
  };

  const quickPayOptions = useMemo(() => {
    if (!cart.totals.total) return [];
    const total = cart.totals.total;
    return Array.from(new Set([total, Math.ceil(total / 5000) * 5000, Math.ceil(total / 10000) * 10000, 50000, 100000, 200000]))
      .filter((amount) => amount >= total)
      .sort((a, b) => a - b)
      .slice(0, 5);
  }, [cart.totals.total]);

  const checkout = async (override?: { method?: PaymentMethod; status?: SaleStatus; paid?: number }) => {
    if (!cart.items.length) {
      showToast('Keranjang masih kosong.');
      return;
    }

    const missingDigital = cart.items.find((item) => item.type === 'digital' && !item.digital_target?.trim());
    if (missingDigital) {
      showToast(`Isi target untuk ${missingDigital.product_name}.`);
      return;
    }

    const chosenMethod = override?.method ?? paymentMethod;
    const chosenSaleStatus = override?.status ?? (cart.hasPending ? 'Pending' : transactionStatus);
    const paid = override?.paid ?? (paymentStatus === 'Lunas' && paidAmount <= 0 ? cart.totals.total : paidAmount);
    if (paymentStatus === 'Lunas' && chosenMethod !== 'Tempo' && paid < cart.totals.total) {
      showToast('Nominal bayar kurang dari total.');
      return;
    }

    const saleId = uuid();
    const selectedCustomer = data.customers.find((customer) => customer.id === selectedCustomerId);
    const saleItems: SaleItem[] = cart.items.map((item) => ({
      id: uuid(),
      sale_id: saleId,
      product_id: item.product_id,
      sku: item.sku,
      product_name: item.product_name,
      quantity: item.quantity,
      price: item.price,
      cost: item.cost,
      discount: item.discount,
      line_total: itemTotal(item),
      item_type: item.type,
      item_category: item.item_category ?? productCategory(item.type),
      digital_target: item.digital_target ?? '',
      notes: item.notes ?? '',
      status: item.status ?? chosenSaleStatus,
      created_at: todayIso(),
    }));

    const sale: Sale = {
      id: saleId,
      invoice_no: makeInvoiceNo(data.sales.length),
      customer_id: selectedCustomer?.id ?? null,
      customer_name: selectedCustomer?.name || 'Pelanggan Umum',
      subtotal: cart.totals.subtotal,
      discount: cart.discount,
      tax: cart.totals.tax,
      total: cart.totals.total,
      paid: chosenMethod === 'Tempo' ? 0 : paid,
      change: chosenMethod === 'Tempo' ? 0 : Math.max(paid - cart.totals.total, 0),
      payment_method: chosenMethod,
      payment_status: chosenMethod === 'Tempo' ? 'Tempo' : paymentStatus,
      transaction_status: chosenSaleStatus,
      cashier: data.settings.cashier_name,
      notes: cart.notes,
      created_at: todayIso(),
      items: saleItems,
    };

    const soldStock = new Map<string, number>();
    saleItems.forEach((item) => {
      if (item.item_type === 'stock' && item.product_id) {
        soldStock.set(item.product_id, (soldStock.get(item.product_id) ?? 0) + item.quantity);
      }
    });

    const nextProducts = data.products.map((product) => {
      const sold = soldStock.get(product.id) ?? 0;
      return sold ? { ...product, stock: Math.max(product.stock - sold, 0), updated_at: todayIso() } : product;
    });
    const changedProducts = nextProducts.filter((product) => soldStock.has(product.id));
    const nextData = { ...data, products: nextProducts, sales: [sale, ...data.sales] };

    try {
      await recordSale(sale, changedProducts);
      setConnection((current) => ({ ...current, error: undefined }));
    } catch (error) {
      setConnection({ source: 'local', error: error instanceof Error ? error.message : 'Gagal sinkron Supabase.' });
      showToast('Tersimpan lokal, Supabase gagal sinkron.');
    }

    commitData(nextData);
    countedTransactionIdsRef.current.add(sale.id);
    mergeBestSellerCounts(calculateBestSellerCounts([sale]));
    cart.clear();
    setPaidAmount(0);
    setTransactionStatus('Sukses');
    setReceiptSale(sale);
  };

  const persistProduct = async (product: Product) => {
    const clean: Product = {
      ...product,
      sku: product.sku.trim().toUpperCase(),
      name: product.name.trim(),
      category: product.category.trim() || productCategory(product.type),
      price: toNumber(product.price),
      cost: toNumber(product.cost),
      stock: product.type === 'stock' ? toNumber(product.stock) : 0,
      min_stock: product.type === 'stock' ? toNumber(product.min_stock) : 0,
      unit: product.unit || (product.type === 'stock' ? 'pcs' : 'trx'),
      updated_at: todayIso(),
    };

    if (!clean.sku || !clean.name) {
      showToast('SKU dan nama produk wajib diisi.');
      return;
    }

    const exists = data.products.some((item) => item.id === clean.id);
    const nextProducts = exists
      ? data.products.map((item) => (item.id === clean.id ? clean : item))
      : [clean, ...data.products];
    commitData({ ...data, products: nextProducts });
    setProductDraft(null);

    try {
      await saveProduct(clean);
    } catch (error) {
      setConnection({ source: 'local', error: error instanceof Error ? error.message : 'Gagal simpan produk.' });
    }
  };

  const deleteProduct = async (product: Product) => {
    commitData({ ...data, products: data.products.filter((item) => item.id !== product.id) });
    try {
      await deleteProductRemote(product.id);
    } catch (error) {
      setConnection({ source: 'local', error: error instanceof Error ? error.message : 'Gagal hapus produk.' });
    }
  };

  const saveShopSettings = async () => {
    const settings = { ...settingsDraft, tax_rate: toNumber(settingsDraft.tax_rate) };
    commitData({ ...data, settings });
    try {
      await saveSettings(settings);
    } catch (error) {
      setConnection({ source: 'local', error: error instanceof Error ? error.message : 'Gagal simpan setting.' });
    }
    showToast('Setting disimpan.');
  };

  const createAnnouncement = async (message: string, expiresAt: string | null) => {
    const announcement: Announcement = {
      id: uuid(),
      message,
      active: true,
      expires_at: expiresAt,
      created_by: auth.user?.id ?? null,
      created_by_role: appRole,
      created_at: todayIso(),
      updated_at: todayIso(),
    };

    setSavingAnnouncement(true);
    setAnnouncements((current) => [announcement, ...current].filter((item) => isAnnouncementActive(item)));
    try {
      await saveAnnouncement(announcement);
      showToast('Pengumuman dipublikasikan.');
    } catch (error) {
      setConnection({ source: 'local', error: error instanceof Error ? error.message : 'Gagal simpan pengumuman.' });
      showToast('Pengumuman tersimpan lokal, Supabase gagal sinkron.');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const hideAnnouncement = async (id: string) => {
    setAnnouncements((current) => current.filter((announcement) => announcement.id !== id));
    try {
      await archiveAnnouncement(id);
    } catch (error) {
      setConnection({ source: 'local', error: error instanceof Error ? error.message : 'Gagal arsip pengumuman.' });
    }
  };

  const persistUserRole = async (record: UserRoleRecord) => {
    const clean = { ...record, updated_at: todayIso() };
    setSavingRole(true);
    setUserRoles((current) => [clean, ...current.filter((item) => item.user_id !== clean.user_id)]);
    try {
      await saveUserRole(clean);
      showToast('Role disimpan.');
    } catch (error) {
      setConnection({ source: 'local', error: error instanceof Error ? error.message : 'Gagal simpan role.' });
      showToast('Role gagal disinkronkan.');
    } finally {
      setSavingRole(false);
    }
  };

  const deleteUserRole = async (userId: string) => {
    setUserRoles((current) => current.filter((role) => role.user_id !== userId));
    try {
      await deleteUserRoleRemote(userId);
      showToast('Role dihapus.');
    } catch (error) {
      setConnection({ source: 'local', error: error instanceof Error ? error.message : 'Gagal hapus role.' });
    }
  };

  const downloadBackup = () => {
    const url = exportJson(data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `backup-indah-cell-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (file: File) => {
    const parsed = JSON.parse(await file.text()) as AppData;
    commitData({ ...createDefaultData(), ...parsed });
    showToast('Backup berhasil di-import.');
  };

  if (auth.loading || loading) {
    return (
      <div className="grid min-h-screen place-items-center text-earth-700">
        <div className="grid place-items-center gap-3">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-earth-900 text-white shadow-soft">
            <ShoppingCart size={28} />
          </div>
          <p className="font-bold">Menyiapkan Indah Cell POS...</p>
        </div>
      </div>
    );
  }

  if (hasSupabaseConfig && !auth.session) {
    return <LoginPage />;
  }

  return (
    <AppShell
      activeView={currentView}
      onViewChange={setActiveView}
      allowedViews={allowedViews}
      settings={data.settings}
      online={connection.source === 'supabase' && !connection.error}
      onRefresh={refreshData}
      role={appRole}
      userEmail={auth.userEmail}
      demoMode={auth.demoMode}
      announcements={currentView === 'cashier' ? activeAnnouncements : []}
      onSignOut={() => void auth.signOut()}
    >
      {currentView === 'dashboard' && (
        <div className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Pendapatan Hari Ini" value={formatMoney(sum(todaySales, (sale) => sale.total))} caption={`${todaySales.length} transaksi`} icon={<TrendingUp size={22} />} tone="moss" />
            <StatCard title="Pendapatan Bulan Ini" value={formatMoney(sum(monthSales, (sale) => sale.total))} caption={`${monthSales.length} transaksi`} icon={<CalendarDays size={22} />} tone="earth" />
            <StatCard title="Total Transaksi" value={String(data.sales.length)} caption={`Laba kotor ${formatMoney(sum(data.sales, saleProfit))}`} icon={<ReceiptText size={22} />} tone="blue" />
            <StatCard title="Stok Menipis" value={String(lowStock.length)} caption={lowStock[0]?.name ?? 'Semua aman'} icon={<AlertTriangle size={22} />} tone={lowStock.length ? 'red' : 'moss'} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <MiniBarChart points={chartPoints} />
            <div className="panel p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-normal text-earth-500">Notifikasi</p>
                  <h2 className="text-lg font-black text-earth-900">Stok menipis</h2>
                </div>
                <Boxes className="text-clay-600" size={22} />
              </div>
              <div className="grid gap-3">
                {lowStock.map((product) => (
                  <div key={product.id} className="flex items-center justify-between rounded-2xl border border-earth-200 bg-earth-50 p-3">
                    <div>
                      <strong className="block text-sm text-earth-900">{product.name}</strong>
                      <span className="text-xs font-semibold text-earth-500">Minimum {product.min_stock} {product.unit}</span>
                    </div>
                    <b className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-700">{product.stock}</b>
                  </div>
                ))}
                {!lowStock.length && (
                  <div className="rounded-2xl bg-moss-50 p-4 text-sm font-bold text-moss-700">
                    Semua stok fisik masih aman.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView === 'cashier' && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
          <section className="grid gap-4">
            <div className="panel p-4">
              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-earth-400" size={18} />
                  <input
                    ref={searchRef}
                    className="input pl-10"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={handleSearchKey}
                    placeholder="Scan barcode / cari produk"
                  />
                </div>
                {canManageOperations && (
                  <button className="btn-primary" onClick={() => setProductDraft(emptyProduct())}>
                    <PackagePlus size={17} /> Produk Baru
                  </button>
                )}
              </div>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {productTabs.map((tab) => (
                  <button
                    key={tab}
                    className={`chip shrink-0 ${activeProductTab === tab ? 'chip-active' : ''}`}
                    onClick={() => setActiveProductTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="panel p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-black text-earth-900">Favorit cepat</h3>
                <span className="text-xs font-bold text-earth-500">Tap untuk tambah</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {favoriteProducts.map((product) => (
                  <button
                    key={product.id}
                    className="rounded-2xl border border-earth-200 bg-earth-50 p-3 text-left transition hover:-translate-y-0.5 hover:border-clay-400 hover:bg-white"
                    onClick={() => handleProductClick(product)}
                  >
                    <strong className="line-clamp-1 block text-sm text-earth-900">{product.name}</strong>
                    <span className="text-sm font-black text-moss-700">{formatMoney(product.price)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {products.map((product) => (
                <button
                  key={product.id}
                  className="panel p-4 text-left transition hover:-translate-y-1 hover:border-clay-400"
                  onClick={() => handleProductClick(product)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-earth-100 px-3 py-1 text-xs font-bold text-earth-700">{productCategory(product.type, product.category)}</span>
                    <span className="text-xs font-bold text-earth-500">{product.sku}</span>
                  </div>
                  <strong className="mt-4 block min-h-11 text-base font-black text-earth-900">{product.name}</strong>
                  <div className="mt-4 flex items-end justify-between">
                    <span className="text-lg font-black text-moss-700">{formatMoney(product.price)}</span>
                    <span className="text-xs font-bold text-earth-500">
                      {product.type === 'stock' ? `${product.stock} ${product.unit}` : product.unit}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <aside className="panel flex flex-col overflow-hidden xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)]">
            <div className="border-b border-earth-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-normal text-earth-500">Keranjang</p>
                  <h2 className="text-xl font-black text-earth-900">{cart.totals.count} item</h2>
                </div>
                <div className="flex gap-2">
                  <button className="icon-btn" onClick={holdCart} title="Tahan keranjang"><WalletCards size={17} /></button>
                  <button className="icon-btn text-red-600" onClick={cart.clear} title="Kosongkan"><Trash2 size={17} /></button>
                </div>
              </div>
              {heldCarts.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {heldCarts.map((held) => (
                    <button key={held.id} className="chip shrink-0" onClick={() => restoreHeldCart(held.id)}>
                      {held.label} - {held.items.length}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid min-h-0 gap-4 overflow-y-auto p-4 pb-28 xl:flex-1 xl:pb-4">
              <div className="grid gap-3 rounded-2xl border border-earth-200 bg-earth-50 p-3">
                <div className="grid grid-cols-[1fr_110px_40px] gap-2">
                  <input className="input" value={quickName} onChange={(event) => setQuickName(event.target.value)} placeholder="Item cepat" />
                  <input className="input" inputMode="numeric" value={quickPrice} onChange={(event) => setQuickPrice(event.target.value)} placeholder="Harga" />
                  <button className="icon-btn" onClick={addQuickItem} aria-label="Tambah item cepat"><Plus size={17} /></button>
                </div>
              </div>

              <div className="grid gap-3">
                {cart.items.map((item) => (
                  <div key={item.cart_id} className="rounded-2xl border border-earth-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <strong className="block text-sm font-black text-earth-900">{item.product_name}</strong>
                        <span className="text-xs font-bold text-earth-500">{formatMoney(item.price)}</span>
                      </div>
                      <button className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-600" onClick={() => cart.removeItem(item.cart_id)}>
                        <X size={15} />
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-[104px_1fr] gap-2">
                      <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-earth-200">
                        <button className="bg-earth-50 font-black" onClick={() => cart.updateQuantity(item.cart_id, item.quantity - 1)}>-</button>
                        <input className="h-9 w-full text-center text-sm font-bold outline-none" value={item.quantity} onChange={(event) => cart.updateQuantity(item.cart_id, toNumber(event.target.value))} />
                        <button className="bg-earth-50 font-black" onClick={() => cart.updateQuantity(item.cart_id, item.quantity + 1)}>+</button>
                      </div>
                      <input className="input h-9" inputMode="numeric" value={item.discount} onChange={(event) => cart.updateMeta(item.cart_id, { discount: toNumber(event.target.value) })} placeholder="Diskon item" />
                    </div>
                    {(item.type === 'digital' || item.type === 'service') && (
                      <div className="mt-2 grid gap-2">
                        {item.type === 'digital' && (
                          <input className="input" value={item.digital_target ?? ''} onChange={(event) => cart.updateMeta(item.cart_id, { digital_target: event.target.value })} placeholder={digitalPlaceholder(item.product_name)} />
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <select className="input" value={item.status ?? 'Sukses'} onChange={(event) => cart.updateMeta(item.cart_id, { status: event.target.value as SaleStatus })}>
                            {saleStatuses.map((status) => <option key={status}>{status}</option>)}
                          </select>
                          <input className="input" value={item.notes ?? ''} onChange={(event) => cart.updateMeta(item.cart_id, { notes: event.target.value })} placeholder="Catatan" />
                        </div>
                      </div>
                    )}
                    <div className="mt-3 flex justify-between text-sm font-black">
                      <span>Total item</span>
                      <span>{formatMoney(itemTotal(item))}</span>
                    </div>
                  </div>
                ))}
                {!cart.items.length && (
                  <div className="rounded-2xl border border-dashed border-earth-300 bg-earth-50 p-6 text-center text-sm font-bold text-earth-500">
                    Keranjang kosong.
                  </div>
                )}
              </div>

              <div className="grid gap-3 rounded-2xl border border-earth-200 bg-earth-50 p-3">
                <label className="field">
                  Pelanggan
                  <select className="input" value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)}>
                    {data.customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="field">
                    Diskon manual
                    <input className="input" inputMode="numeric" value={cart.discount} onChange={(event) => cart.setDiscount(toNumber(event.target.value))} />
                  </label>
                  <label className="field">
                    Bayar
                    <input className="input" inputMode="numeric" value={paidAmount} onChange={(event) => setPaidAmount(toNumber(event.target.value))} />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="field">
                    Metode
                    <select className="input" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
                      {paymentMethods.map((method) => <option key={method}>{method}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    Status bayar
                    <select className="input" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus)}>
                      <option>Lunas</option>
                      <option>Sebagian</option>
                      <option>Tempo</option>
                    </select>
                  </label>
                </div>
                <label className="field">
                  Status transaksi
                  <select className="input" value={transactionStatus} onChange={(event) => setTransactionStatus(event.target.value as SaleStatus)}>
                    {saleStatuses.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </label>
                <textarea className="textarea" value={cart.notes} onChange={(event) => cart.setNotes(event.target.value)} placeholder="Catatan transaksi" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {quickPayOptions.map((amount) => (
                  <button key={amount} className="btn-soft px-2" onClick={() => setPaidAmount(amount)}>
                    {amount === cart.totals.total ? 'Pas' : formatMoney(amount)}
                  </button>
                ))}
              </div>

              <div className="grid gap-2 rounded-2xl border border-earth-200 bg-white p-4">
                <div className="flex justify-between text-sm font-bold text-earth-500"><span>Subtotal</span><span>{formatMoney(cart.totals.subtotal)}</span></div>
                <div className="flex justify-between text-sm font-bold text-earth-500"><span>Diskon</span><span>{formatMoney(cart.discount)}</span></div>
                <div className="flex justify-between text-sm font-bold text-earth-500"><span>Pajak</span><span>{formatMoney(cart.totals.tax)}</span></div>
                <div className="mt-2 flex justify-between border-t border-dashed border-earth-300 pt-3 text-xl font-black text-earth-900">
                  <span>Total</span><span>{formatMoney(cart.totals.total)}</span>
                </div>
              </div>

            </div>

            <div className="sticky bottom-20 z-20 shrink-0 border-t border-earth-200 bg-white/95 p-4 backdrop-blur md:bottom-0 xl:static">
              <div className="grid gap-2">
                <button className="btn-primary min-h-12 text-base" onClick={() => checkout()}>
                  <ReceiptText size={19} /> Pay
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button className="btn-soft" onClick={() => checkout({ method: 'QRIS', status: 'Sukses', paid: cart.totals.total })}><QrCode size={17} /> QRIS</button>
                  <button className="btn-soft" onClick={() => checkout({ method: 'Tempo', status: 'Pending', paid: 0 })}><AlertTriangle size={17} /> Pending</button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {currentView === 'inventory' && (
        <div className="grid gap-5">
          <div className="panel flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-normal text-earth-500">Inventory</p>
              <h2 className="text-xl font-black text-earth-900">Produk digital, aksesoris, dan jasa</h2>
            </div>
            <button className="btn-primary" onClick={() => setProductDraft(emptyProduct())}><Plus size={17} /> Tambah Produk</button>
          </div>

          <div className="panel overflow-hidden">
            <div className="overflow-auto">
              <table className="w-full min-w-[860px] border-collapse">
                <thead className="bg-earth-50 text-left text-xs uppercase tracking-normal text-earth-500">
                  <tr>
                    <th className="p-4">Produk</th>
                    <th className="p-4">Kategori</th>
                    <th className="p-4">Harga</th>
                    <th className="p-4">Modal</th>
                    <th className="p-4">Stok</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((product) => (
                    <tr key={product.id} className="border-t border-earth-100">
                      <td className="p-4">
                        <strong className="block text-earth-900">{product.name}</strong>
                        <span className="text-xs font-bold text-earth-500">{product.sku}</span>
                      </td>
                      <td className="p-4">{product.category}</td>
                      <td className="p-4 font-bold">{formatMoney(product.price)}</td>
                      <td className="p-4 font-bold">{formatMoney(product.cost)}</td>
                      <td className="p-4">
                        {product.type === 'stock' ? (
                          <div className="inline-flex items-center overflow-hidden rounded-xl border border-earth-200">
                            <button className="h-9 w-9 bg-earth-50 font-black" onClick={() => persistProduct({ ...product, stock: Math.max(product.stock - 1, 0) })}>-</button>
                            <b className={`grid h-9 w-12 place-items-center ${product.stock <= product.min_stock ? 'text-red-600' : ''}`}>{product.stock}</b>
                            <button className="h-9 w-9 bg-earth-50 font-black" onClick={() => persistProduct({ ...product, stock: product.stock + 1 })}>+</button>
                          </div>
                        ) : (
                          <span className="rounded-full bg-earth-100 px-3 py-1 text-xs font-bold text-earth-700">Non stok</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${product.active ? 'bg-moss-100 text-moss-700' : 'bg-earth-100 text-earth-500'}`}>
                          {product.active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button className="icon-btn" onClick={() => setProductDraft(product)}><Edit3 size={16} /></button>
                          <button className="icon-btn text-red-600" onClick={() => deleteProduct(product)}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {currentView === 'transactions' && (
        <div className="grid gap-5">
          <div className="panel grid gap-3 p-4 lg:grid-cols-5">
            <label className="field">
              Dari tanggal
              <input className="input" type="date" value={historyStart} onChange={(event) => setHistoryStart(event.target.value)} />
            </label>
            <label className="field">
              Sampai tanggal
              <input className="input" type="date" value={historyEnd} onChange={(event) => setHistoryEnd(event.target.value)} />
            </label>
            <label className="field">
              Kategori
              <select className="input" value={historyCategory} onChange={(event) => setHistoryCategory(event.target.value as ProductCategory | 'Semua')}>
                {productTabs.map((tab) => <option key={tab}>{tab}</option>)}
              </select>
            </label>
            <label className="field">
              Status
              <select className="input" value={historyStatus} onChange={(event) => setHistoryStatus(event.target.value as SaleStatus | 'Semua')}>
                <option>Semua</option>
                {saleStatuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <div className="flex items-end">
              <button className="btn-soft w-full" onClick={() => { setHistoryStart(''); setHistoryEnd(''); setHistoryCategory('Semua'); setHistoryStatus('Semua'); }}>
                Reset Filter
              </button>
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="overflow-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead className="bg-earth-50 text-left text-xs uppercase tracking-normal text-earth-500">
                  <tr>
                    <th className="p-4">Invoice</th>
                    <th className="p-4">Tanggal</th>
                    <th className="p-4">Pelanggan</th>
                    <th className="p-4">Kategori</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Total</th>
                    {canViewFinancialReports && <th className="p-4">Laba</th>}
                    <th className="p-4">Struk</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="border-t border-earth-100">
                      <td className="p-4">
                        <strong className="block text-earth-900">{sale.invoice_no}</strong>
                        <span className="text-xs font-bold text-earth-500">{sale.payment_method}</span>
                      </td>
                      <td className="p-4">{new Date(sale.created_at).toLocaleString('id-ID')}</td>
                      <td className="p-4">{sale.customer_name}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {Array.from(new Set(sale.items.map((item) => item.item_category ?? productCategory(item.item_type)))).map((category) => (
                            <span key={category} className="rounded-full bg-earth-100 px-2 py-1 text-xs font-bold text-earth-700">{category}</span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone[sale.transaction_status ?? 'Sukses']}`}>
                          {sale.transaction_status ?? 'Sukses'}
                        </span>
                      </td>
                      <td className="p-4 font-black">{formatMoney(sale.total)}</td>
                      {canViewFinancialReports && <td className="p-4 font-bold">{formatMoney(saleProfit(sale))}</td>}
                      <td className="p-4">
                        <button className="icon-btn" onClick={() => setReceiptSale(sale)}><FileText size={16} /></button>
                      </td>
                    </tr>
                  ))}
                  {!filteredSales.length && (
                    <tr>
                      <td colSpan={canViewFinancialReports ? 8 : 7} className="p-10 text-center font-bold text-earth-500">Tidak ada transaksi.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {currentView === 'settings' && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-5">
            <section className="panel p-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-normal text-earth-500">Profil Struk</p>
                <h2 className="text-xl font-black text-earth-900">Pengaturan Indah Cell</h2>
              </div>
              <button className="btn-primary" onClick={saveShopSettings}><Save size={17} /> Simpan</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="field">Nama toko<input className="input" value={settingsDraft.shop_name} onChange={(event) => setSettingsDraft({ ...settingsDraft, shop_name: event.target.value })} /></label>
              <label className="field">Telepon<input className="input" value={settingsDraft.phone} onChange={(event) => setSettingsDraft({ ...settingsDraft, phone: event.target.value })} /></label>
              <label className="field">Nama kasir<input className="input" value={settingsDraft.cashier_name} onChange={(event) => setSettingsDraft({ ...settingsDraft, cashier_name: event.target.value })} /></label>
              <label className="field">Pajak %<input className="input" inputMode="numeric" value={settingsDraft.tax_rate} onChange={(event) => setSettingsDraft({ ...settingsDraft, tax_rate: toNumber(event.target.value) })} /></label>
              <label className="field md:col-span-2">Alamat<textarea className="textarea" value={settingsDraft.address} onChange={(event) => setSettingsDraft({ ...settingsDraft, address: event.target.value })} /></label>
              <label className="field md:col-span-2">Footer struk<textarea className="textarea" value={settingsDraft.receipt_footer} onChange={(event) => setSettingsDraft({ ...settingsDraft, receipt_footer: event.target.value })} /></label>
            </div>
            </section>

            {canManageOperations && (
              <AnnouncementManager
                announcements={activeAnnouncements}
                saving={savingAnnouncement}
                onCreate={createAnnouncement}
                onArchive={hideAnnouncement}
              />
            )}

            {appRole === 'owner' && (
              <RoleManager
                roles={userRoles}
                saving={savingRole}
                onSave={persistUserRole}
                onDelete={deleteUserRole}
              />
            )}
          </div>

          <aside className="panel p-5">
            <h2 className="text-lg font-black text-earth-900">Backup & Database</h2>
            <div className="mt-4 grid gap-3">
              <button className="btn-soft w-full" onClick={downloadBackup}><Download size={17} /> Export JSON</button>
              <button className="btn-soft w-full" onClick={() => importInputRef.current?.click()}><Upload size={17} /> Import JSON</button>
              <input
                ref={importInputRef}
                className="hidden"
                type="file"
                accept="application/json"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) importBackup(file).catch(() => showToast('File backup tidak valid.'));
                  event.currentTarget.value = '';
                }}
              />
              <button
                className="btn-danger w-full"
                onClick={() => {
                  const fresh = resetLocalDemo();
                  commitData(fresh);
                  setSettingsDraft(fresh.settings);
                }}
              >
                <Trash2 size={17} /> Reset Demo Lokal
              </button>
            </div>
            <div className="mt-5 rounded-2xl bg-earth-50 p-4 text-sm">
              <strong className="block text-earth-900">{hasSupabaseConfig ? 'Supabase dikonfigurasi' : 'Supabase belum dikonfigurasi'}</strong>
              <span className="mt-1 block text-earth-500">{connection.error ?? 'Gunakan .env dan schema SQL untuk sinkron database.'}</span>
            </div>
          </aside>
        </div>
      )}

      {productDraft && (
        <ProductModal
          product={productDraft}
          onChange={setProductDraft}
          onClose={() => setProductDraft(null)}
          onSave={() => persistProduct(productDraft)}
        />
      )}

      {receiptSale && <ReceiptModal sale={receiptSale} settings={data.settings} onClose={() => setReceiptSale(null)} />}

      <SalesRealtimePopup popups={salesPopups} />

      {toast && (
        <div className="fixed bottom-24 right-4 z-50 max-w-sm rounded-2xl bg-earth-900 px-4 py-3 text-sm font-bold text-white shadow-soft md:bottom-5">
          {toast}
        </div>
      )}
    </AppShell>
  );
};

export default App;
