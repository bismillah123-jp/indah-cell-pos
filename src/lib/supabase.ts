import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const hasSupabaseConfig = Boolean(
  supabaseUrl &&
    publishableKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project') &&
    !publishableKey.includes('your_key'),
);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, publishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: { 'x-client-info': 'konter-hp-pos' },
      },
    })
  : null;
