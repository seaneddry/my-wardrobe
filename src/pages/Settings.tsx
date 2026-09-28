import { useState } from 'react';
import { Header } from '../components/Header';
import { config, dashboardUrl } from '../config';
import { LOOKUP_LISTS } from '../data/types';
import { errorMessage } from '../lib/format';
import { useAuth } from '../state/auth';
import { useData } from '../state/data';

async function shareOrDownload(file: File) {
  // iOS home-screen apps handle the share sheet better than downloads.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function Settings() {
  const { session, signOut } = useAuth();
  const { items, fields, lookups, refresh, schemaVersion, schemaBehind } = useData();
  const [status, setStatus] = useState<string | null>(null);
  const dashboard = dashboardUrl();

  async function exportData() {
    setStatus(null);
    try {
      const payload = {
        exported_at: new Date().toISOString(),
        app_version: config.appVersion,
        schema_version: schemaVersion,
        items,
        lookups: LOOKUP_LISTS.flatMap((l) => lookups(l)),
        field_definitions: fields,
      };
      const stamp = new Date().toISOString().slice(0, 10);
      const file = new File([JSON.stringify(payload, null, 2)], `wardrobe-backup-${stamp}.json`, { type: 'application/json' });
      await shareOrDownload(file);
    } catch (err) {
      setStatus(errorMessage(err));
    }
  }

  async function reload() {
    setStatus('Refreshing…');
    await refresh();
    setStatus('Up to date.');
  }

  return (
    <div className="screen">
      <Header title="Settings" />
      <main className="page stack">
        {schemaBehind && (
          <p className="notice notice-error">
            Your database is on version {schemaVersion}, but this app needs version {config.requiredSchema}. Run the newer
            files from <code>supabase/migrations</code> in the Supabase SQL Editor.
          </p>
        )}

        <section className="panel">
          <h2 className="section-title">Account</h2>
          <p>Signed in as {session?.user.email}</p>
          <button type="button" className="button button-secondary" onClick={() => signOut()}>
            Sign out
          </button>
        </section>

        <section className="panel">
          <h2 className="section-title">Your data</h2>
          <p>
            Save a copy of every piece's details as a JSON file. Photos stay in Supabase Storage and aren't included.
          </p>
          <div className="action-row">
            <button type="button" className="button button-secondary" onClick={exportData}>
              Export backup
            </button>
            <button type="button" className="button button-quiet" onClick={reload}>
              Refresh from server
            </button>
          </div>
          {status && <p className="meta" role="status">{status}</p>}
        </section>

        <section className="panel">
          <h2 className="section-title">Lists and custom fields</h2>
          <p>
            Categories, colours, sizes, seasons, occasions and conditions live in the <code>lookups</code> table. Extra
            fields for the item form live in <code>field_definitions</code>. Until the web CMS arrives, edit them in the
            Supabase Table Editor. Changes appear here next time you open the app.
          </p>
          {dashboard && (
            <a className="button button-secondary" href={`${dashboard}/editor`} target="_blank" rel="noreferrer">
              Open Supabase Table Editor
            </a>
          )}
        </section>

        <section className="panel">
          <h2 className="section-title">About</h2>
          <dl className="details">
            <div className="detail-row">
              <dt>App version</dt>
              <dd>{config.appVersion}</dd>
            </div>
            <div className="detail-row">
              <dt>Database version</dt>
              <dd>{schemaVersion ?? 'Unknown'}</dd>
            </div>
            <div className="detail-row">
              <dt>Pieces stored</dt>
              <dd>{items.length}</dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}
