import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { hasSupabaseConfig, supabase } from '../lib/supabase';
import type { UserRole } from '../types';

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  userEmail: string;
  demoMode: boolean;
};

const normalizeUserRole = (value: unknown): UserRole | null => {
  if (typeof value !== 'string') return null;
  const role = value.trim().toLowerCase();
  if (role === 'owner' || role === 'admin' || role === 'kasir') return role;
  return null;
};

const fetchRole = async (userId: string): Promise<UserRole> => {
  const client = supabase;
  if (!client) return 'owner';

  const { data, error } = await client.from('users_roles').select('role').eq('user_id', userId).maybeSingle();
  if (error) {
    console.warn('Gagal mengambil role user:', error.message);
    return 'kasir';
  }

  return normalizeUserRole(data?.role) ?? 'kasir';
};

export const useAuthRole = () => {
  const [state, setState] = useState<AuthState>({
    loading: true,
    session: null,
    user: null,
    role: null,
    userEmail: '',
    demoMode: !hasSupabaseConfig,
  });

  const syncSession = useCallback(async (session: Session | null, isAlive: () => boolean = () => true) => {
    if (!hasSupabaseConfig || !supabase) {
      if (!isAlive()) return;
      setState({
        loading: false,
        session: null,
        user: null,
        role: 'owner',
        userEmail: 'Supabase belum dikonfigurasi',
        demoMode: true,
      });
      return;
    }

    if (!session?.user) {
      if (!isAlive()) return;
      setState({
        loading: false,
        session: null,
        user: null,
        role: null,
        userEmail: '',
        demoMode: false,
      });
      return;
    }

    const role = await fetchRole(session.user.id);
    if (!isAlive()) return;

    setState({
      loading: false,
      session,
      user: session.user,
      role,
      userEmail: session.user.email ?? 'User',
      demoMode: false,
    });
  }, []);

  useEffect(() => {
    let alive = true;

    if (!hasSupabaseConfig || !supabase) {
      void syncSession(null, () => alive);
      return () => {
        alive = false;
      };
    }

    supabase.auth.getSession().then(({ data }) => {
      void syncSession(data.session, () => alive);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((current) => ({ ...current, loading: true }));
      void syncSession(session, () => alive);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [syncSession]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  return { ...state, signOut };
};
