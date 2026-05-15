import {
  History,
  LayoutDashboard,
  LogOut,
  Package,
  RefreshCw,
  Settings,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { Announcement, ShopSettings, UserRole } from '../types';
import { RunningText } from './RunningText';

export type AppView = 'dashboard' | 'cashier' | 'inventory' | 'transactions' | 'settings';

type AppShellProps = {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  allowedViews: AppView[];
  settings: ShopSettings;
  online: boolean;
  onRefresh: () => void;
  role: UserRole;
  userEmail: string;
  demoMode: boolean;
  announcements: Announcement[];
  onSignOut: () => void;
  children: ReactNode;
};

const navItems: Array<{ id: AppView; label: string; icon: ReactNode }> = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'cashier', label: 'Kasir', icon: <ShoppingBag size={18} /> },
  { id: 'inventory', label: 'Inventory', icon: <Package size={18} /> },
  { id: 'transactions', label: 'Riwayat', icon: <History size={18} /> },
  { id: 'settings', label: 'Setting', icon: <Settings size={18} /> },
];

const pageTitle: Record<AppView, string> = {
  dashboard: 'Dashboard Analytics',
  cashier: 'Menu Kasir',
  inventory: 'Manajemen Inventory',
  transactions: 'Riwayat Transaksi',
  settings: 'Pengaturan Toko',
};

const roleLabel: Record<UserRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  kasir: 'Kasir',
};

export const AppShell = ({
  activeView,
  onViewChange,
  allowedViews,
  settings,
  online,
  onRefresh,
  role,
  userEmail,
  demoMode,
  announcements,
  onSignOut,
  children,
}: AppShellProps) => {
  const visibleNav = navItems.filter((item) => allowedViews.includes(item.id));

  return (
    <div className="min-h-screen pb-20 text-earth-900 md:pb-0">
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r border-earth-200/70 bg-earth-900 p-5 text-white md:flex">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-clay-400 text-earth-900">
          <ShoppingBag size={24} />
        </div>
        <div>
          <h1 className="text-lg font-black">{settings.shop_name}</h1>
          <p className="text-xs font-semibold text-earth-200">POS Konter HP</p>
        </div>
      </div>

      <nav className="mt-8 grid gap-2">
        {visibleNav.map((item) => (
          <button
            key={item.id}
            className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 text-left text-sm font-bold transition ${
              activeView === item.id ? 'bg-white text-earth-900' : 'text-earth-100 hover:bg-earth-800'
            }`}
            onClick={() => onViewChange(item.id)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto grid gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-clay-100">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-normal text-earth-200">{roleLabel[role]}</p>
              <strong className="block truncate text-sm">{userEmail}</strong>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-normal text-earth-200">Database</p>
              <strong className="text-sm">{online ? 'Supabase aktif' : 'Mode lokal'}</strong>
            </div>
            <span className={`h-3 w-3 rounded-full ${online ? 'bg-emerald-400' : 'bg-amber-300'}`} />
          </div>
        </div>

        {!demoMode && (
          <button className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white/10 text-sm font-bold text-white transition hover:bg-white/15" onClick={onSignOut}>
            <LogOut size={17} /> Logout
          </button>
        )}
      </div>
    </aside>

    <div className="md:pl-72">
      <header className="sticky top-0 z-10 border-b border-earth-200/70 bg-earth-50/80 backdrop-blur">
        <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-normal text-earth-500">Indah Cell</p>
            <h2 className="text-xl font-black text-earth-900 md:text-2xl">{pageTitle[activeView]}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-earth-100 px-3 py-2 text-xs font-black text-earth-700 sm:inline">
              {roleLabel[role]}
            </span>
            <button className="btn-soft" onClick={onRefresh}>
              <RefreshCw size={17} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            {!demoMode && (
              <button className="icon-btn" onClick={onSignOut} title="Logout">
                <LogOut size={17} />
              </button>
            )}
          </div>
        </div>
        <RunningText announcements={announcements} />
      </header>

      <main className="px-4 py-5 md:px-7">{children}</main>
    </div>

    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid border-t border-earth-200 bg-white p-2 shadow-soft md:hidden"
      style={{ gridTemplateColumns: `repeat(${visibleNav.length + (demoMode ? 0 : 1)}, minmax(0, 1fr))` }}
    >
      {visibleNav.map((item) => (
        <button
          key={item.id}
          className={`grid place-items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-bold ${
            activeView === item.id ? 'bg-earth-900 text-white' : 'text-earth-500'
          }`}
          onClick={() => onViewChange(item.id)}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
      {!demoMode && (
        <button
          className="grid place-items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-bold text-red-600"
          onClick={onSignOut}
        >
          <LogOut size={18} />
          Logout
        </button>
      )}
    </nav>
  </div>
  );
};
