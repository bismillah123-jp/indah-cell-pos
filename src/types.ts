export type ProductType = 'stock' | 'digital' | 'service';
export type ProductCategory = 'Digital' | 'Aksesoris' | 'Jasa' | 'Lainnya';
export type PaymentMethod = 'Tunai' | 'QRIS' | 'Transfer' | 'Tempo';
export type PaymentStatus = 'Lunas' | 'Sebagian' | 'Tempo';
export type SaleStatus = 'Sukses' | 'Pending' | 'Batal';
export type UserRole = 'owner' | 'admin' | 'kasir';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  type: ProductType;
  price: number;
  cost: number;
  stock: number;
  min_stock: number;
  unit: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  notes: string;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  sku: string;
  product_name: string;
  quantity: number;
  price: number;
  cost: number;
  discount: number;
  line_total: number;
  item_type: ProductType;
  item_category?: string;
  digital_target?: string;
  notes?: string;
  status?: SaleStatus;
  created_at: string;
}

export interface Sale {
  id: string;
  invoice_no: string;
  customer_id: string | null;
  customer_name: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  change: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  transaction_status?: SaleStatus;
  cashier: string;
  notes: string;
  created_at: string;
  items: SaleItem[];
}

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  notes: string;
  created_at: string;
}

export interface ShopSettings {
  id: string;
  shop_name: string;
  address: string;
  phone: string;
  cashier_name: string;
  tax_rate: number;
  receipt_footer: string;
}

export interface AppData {
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  expenses: Expense[];
  settings: ShopSettings;
}

export interface Announcement {
  id: string;
  message: string;
  active: boolean;
  expires_at: string | null;
  created_by?: string | null;
  created_by_role?: UserRole | null;
  created_at: string;
  updated_at: string;
}

export interface SalesPopup {
  id: string;
  invoice_no: string;
  total: number;
  cashier: string;
  created_at: string;
}

export interface CartItem {
  cart_id: string;
  product_id: string | null;
  sku: string;
  product_name: string;
  type: ProductType;
  price: number;
  cost: number;
  quantity: number;
  discount: number;
  item_category?: string;
  digital_target?: string;
  notes?: string;
  status?: SaleStatus;
}
