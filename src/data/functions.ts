import { config } from '../config';
import { supabase } from '../lib/supabase';

export class NotSetUpError extends Error {
  constructor(what: string, guide: string) {
    super(`${what} isn’t set up yet. Follow “${guide}” in docs/UPGRADING.md.`);
  }
}

/** Calls one of this project's Edge Functions as the signed-in user. */
export async function callFunction(name: string, body: Record<string, unknown>, notSetUp: NotSetUpError): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Please sign in again.');
  let res: Response;
  try {
    res = await fetch(`${config.supabaseUrl}/functions/v1/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: config.supabaseKey },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Couldn’t reach the server. Check your connection.');
  }
  if (res.status === 404) throw notSetUp;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (err.error === 'not_configured') throw notSetUp;
    throw new Error(err.error ?? err.msg ?? err.message ?? `Request failed (${res.status}).`);
  }
  return res;
}
