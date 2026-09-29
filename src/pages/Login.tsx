import { useState, type FormEvent } from 'react';
import { Group } from '../components/Group';
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
    <form className="login" onSubmit={submit}>
      <div className="login-brand">
        <img src={`${import.meta.env.BASE_URL}apple-touch-icon.png`} alt="" />
        <h1>My Wardrobe</h1>
        <p>Sign in with the account you created in Supabase.</p>
      </div>
      <Group>
        <label className="row-input" htmlFor="email">
          <span className="row-label">Email</span>
          <input id="email" type="email" autoComplete="username" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="row-input" htmlFor="password">
          <span className="row-label">Password</span>
          <input id="password" type="password" autoComplete="current-password" placeholder="Required" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
      </Group>
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      <button className="button button-primary button-block" type="submit" disabled={busy || !email || !password}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
