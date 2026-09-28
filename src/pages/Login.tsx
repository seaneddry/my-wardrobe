import { useState, type FormEvent } from 'react';
import { Header } from '../components/Header';
import { errorMessage } from '../lib/format';
import { useAuth } from '../state/auth';

export function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <Header title="My Wardrobe" subtitle="Sign in with the account you created in Supabase." />
      <form className="page stack" onSubmit={submit}>
        <label className="field" htmlFor="email">
          <span className="field-label">Email</span>
          <input id="email" className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field" htmlFor="password">
          <span className="field-label">Password</span>
          <input id="password" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <button className="button button-primary button-block" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
