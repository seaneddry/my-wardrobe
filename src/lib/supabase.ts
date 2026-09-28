import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

// When the app isn't configured yet, a placeholder client is created so imports
// don't fail; App.tsx shows the setup screen instead of using it.
export const supabase = createClient(
  config.supabaseUrl || 'https://placeholder.supabase.co',
  config.supabaseKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Password sign-in only. Email links would open in Safari, not the home-screen app.
      detectSessionInUrl: false,
      storageKey: 'wardrobe-auth',
    },
  },
);
