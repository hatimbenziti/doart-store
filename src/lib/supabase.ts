import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve configuration from env or localStorage
export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (envUrl && envKey && !envUrl.includes('your-project-id')) {
    return { url: envUrl, key: envKey, source: 'env' as const };
  }

  const localUrl = localStorage.getItem('doart_supabase_url');
  const localKey = localStorage.getItem('doart_supabase_key');

  if (localUrl && localKey) {
    return { url: localUrl, key: localKey, source: 'localStorage' as const };
  }

  return { url: '', key: '', source: 'none' as const };
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return supabaseInstance;
}

export function isSupabaseConnected(): boolean {
  return !!getSupabaseClient();
}

export function saveLocalSupabaseCredentials(url: string, key: string) {
  if (url && key) {
    localStorage.setItem('doart_supabase_url', url.trim());
    localStorage.setItem('doart_supabase_key', key.trim());
  } else {
    localStorage.removeItem('doart_supabase_url');
    localStorage.removeItem('doart_supabase_key');
  }
  supabaseInstance = null;
  window.dispatchEvent(new Event('doart_supabase_config_changed'));
}
