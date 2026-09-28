import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { clearPhotoUrlCache } from '../data/photos';
import { CACHE_KEYS, removeKey } from '../lib/storage';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  ready: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      throw new Error(
        error.message.toLowerCase().includes('invalid')
          ? 'Email or password is incorrect.'
          : error.message,
      );
    }
  }

  async function signOut() {
    Object.values(CACHE_KEYS).forEach(removeKey);
    clearPhotoUrlCache();
    await supabase.auth.signOut();
  }

  return <AuthContext.Provider value={{ session, ready, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
