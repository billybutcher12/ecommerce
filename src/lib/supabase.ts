import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// These would typically come from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'sb-auth-token',
    storage: {
      getItem: (key) => {
        try {
          return JSON.parse(localStorage.getItem(key) || 'null');
        } catch (error) {
          return null;
        }
      },
      setItem: (key, value) => {
        localStorage.setItem(key, JSON.stringify(value));
      },
      removeItem: (key) => {
        localStorage.removeItem(key);
      },
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});