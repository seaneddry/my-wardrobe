export function ConfigMissing() {
  return (
    <div className="login">
      <div className="login-brand">
        <img src={`${import.meta.env.BASE_URL}apple-touch-icon.png`} alt="" />
        <h1>Almost there</h1>
        <p>This copy of the app isn’t connected to a database yet.</p>
      </div>
      <p className="notice">
        Add the <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> secrets to your GitHub
        repository, then run the deploy workflow again. Step 6 of <code>docs/SETUP.md</code> walks through it.
      </p>
    </div>
  );
}
