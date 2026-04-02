import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.sessionStorage, // Use sessionStorage instead of localStorage so session is cleared when tab/app is closed
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
});
