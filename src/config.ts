const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

export const config = {
  supabaseUrl: url,
  supabaseKey: key,
  isConfigured: Boolean(url && key),
  /** Storage bucket created by migration 001. */
  bucket: 'wardrobe',
  appVersion: __APP_VERSION__,
  /** Highest database migration this version of the app needs. Bump when adding a migration. */
  requiredSchema: '003',
};
