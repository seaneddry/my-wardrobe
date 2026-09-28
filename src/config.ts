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
  requiredSchema: '001',
};

/** Link to this project's Supabase dashboard, derived from the project URL. */
export function dashboardUrl(): string | null {
  const match = config.supabaseUrl.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return match ? `https://supabase.com/dashboard/project/${match[1]}` : null;
}
