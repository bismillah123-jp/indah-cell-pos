import { useMemo, useState } from 'react';
import { uuid } from '../data/seed';
import type { CartItem, Product, SaleStatus } from '../types';
import { itemTotal, productCategory, sum } from '../utils/format';

export const useCart = (products: Product[], taxRate: number) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  const addProduct = (product: Product) => {
    setItems((current) => {
      const existing = current.find((item) => item.product_id === product.id);
      if (existing) {
        const maxQty = product.type === 'stock' ? product.stock : 999;
        return current.map((item) =>
          item.cart_id === existing.cart_id
            ? { ...item, quantity: Math.min(item.quantity + 1, maxQty) }
            : item,
        );
      }

      return [
        ...current,
        {
          cart_id: product.id,
          product_id: product.id,
          sku: product.sku,
          product_name: product.name,
          type: product.type,
          item_category: productCategory(product.type, product.category),
          price: product.price,
          cost: product.cost,
          quantity: 1,
          discount: 0,
          digital_target: '',
          notes: '',
          status: 'Sukses',
        },
      ];
    });
  };

  const addCustomItem = (name: string, price: number) => {
    setItems((current) => [
      ...current,
      {
        cart_id: uuid(),
        product_id: null,
        sku: `CUSTOM-${Date.now()}`,
        product_name: name,
        type: 'service',
        item_category: 'Jasa',
        price,
        cost: 0,
        quantity: 1,
        discount: 0,
        digital_target: '',
        notes: '',
        status: 'Sukses',
      },
    ]);
  };

  const updateQuantity = (cartId: string, quantity: number) => {
    setItems((current) =>
      current.map((item) => {
        if (item.cart_id !== cartId) return item;
        const product = item.product_id ? products.find((entry) => entry.id === item.product_id) : undefined;
        const maxQty = product?.type === 'stock' ? product.stock : 999;
        return { ...item, quantity: Math.max(1, Math.min(quantity || 1, maxQty)) };
      }),
    );
  };

  const updateMeta = (cartId: string, patch: Partial<CartItem>) => {
    setItems((current) => current.map((item) => (item.cart_id === cartId ? { ...item, ...patch } : item)));
  };

  const removeItem = (cartId: string) => {
    setItems((current) => current.filter((item) => item.cart_id !== cartId));
  };

  const clear = () => {
    setItems([]);
    setDiscount(0);
    setNotes('');
  };

  const setHeldCart = (heldItems: CartItem[], heldDiscount: number, heldNotes: string) => {
    setItems(heldItems);
    setDiscount(heldDiscount);
    setNotes(heldNotes);
  };

  const totals = useMemo(() => {
    const subtotal = sum(items, itemTotal);
    const taxable = Math.max(subtotal - discount, 0);
    const tax = Math.round((taxable * taxRate) / 100);
    const total = taxable + tax;
    const count = sum(items, (item) => item.quantity);

    return { subtotal, discount, tax, total, count };
  }, [discount, items, taxRate]);

  const hasPending = items.some((item) => (item.status as SaleStatus) === 'Pending');

  return {
    items,
    setItems,
    discount,
    setDiscount,
    notes,
    setNotes,
    totals,
    hasPending,
    addProduct,
    addCustomItem,
    updateQuantity,
    updateMeta,
    removeItem,
    clear,
    setHeldCart,
  };
};
