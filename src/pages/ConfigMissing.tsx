import { Header } from '../components/Header';

export function ConfigMissing() {
  return (
    <div className="screen">
      <Header title="Almost there" />
      <div className="page stack">
        <p>This copy of the app isn't connected to a database yet.</p>
        <p>
          Add the <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> secrets to your GitHub
          repository, then run the deploy workflow again. Step 4 of <code>docs/SETUP.md</code> walks through it.
        </p>
      </div>
    </div>
  );
}
