import { Link } from 'react-router-dom';
import { Group } from '../components/Group';
import { Icon } from '../components/Icon';
import { NavBar } from '../components/NavBar';
import { useToast } from '../components/Toast';
import { config } from '../config';
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
  const { items, allFields, lookups, refresh, schemaVersion, schemaBehind } = useData();
  const toast = useToast();
  const email = session?.user.email ?? '';
  const photoCount = items.reduce((n, i) => n + i.photos.length, 0);

  async function exportData() {
    try {
      const payload = {
        exported_at: new Date().toISOString(),
        app_version: config.appVersion,
        schema_version: schemaVersion,
        items,
        lookups: LOOKUP_LISTS.flatMap((l) => lookups(l)),
        field_definitions: allFields,
      };
      const stamp = new Date().toISOString().slice(0, 10);
      await shareOrDownload(new File([JSON.stringify(payload, null, 2)], `wardrobe-backup-${stamp}.json`, { type: 'application/json' }));
    } catch (err) {
      toast(errorMessage(err));
    }
  }

  async function reload() {
    await refresh();
    toast('Up to date');
  }

  function confirmSignOut() {
    if (window.confirm('Sign out of My Wardrobe on this device?')) signOut();
  }

  return (
    <div className="screen">
      <NavBar large title="Settings" />
      <main className="page stack" style={{ maxWidth: 720 }}>
        {schemaBehind && (
          <p className="notice notice-error">
            The database is on version {schemaVersion}, but this app needs version {config.requiredSchema}. Run the newer
            files from <code>supabase/migrations</code> in the Supabase SQL Editor (see <code>docs/UPGRADING.md</code>).
          </p>
        )}

        <Group>
          <div className="profile">
            <span className="avatar" aria-hidden="true">
              {email.charAt(0).toUpperCase() || '?'}
            </span>
            <span className="profile-text">
              <strong>{email}</strong>
              <span>
                {items.length} {items.length === 1 ? 'piece' : 'pieces'}, {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
              </span>
            </span>
          </div>
        </Group>

        <Group header="Wardrobe" footer="Categories, colours, sizes, seasons, occasions, conditions, and extra fields for the item form.">
          <Link to="/manage" viewTransition className="row">
            <span className="row-icon">
              <Icon name="list" size={18} />
            </span>
            <span className="row-label">Lists and custom fields</span>
            <Icon name="chevron" size={16} weight={2.4} />
          </Link>
        </Group>

        <Group header="Data" footer="The backup holds every piece's details as a JSON file. Photos stay in your Supabase storage.">
          <button type="button" className="row" onClick={exportData}>
            <span className="row-icon">
              <Icon name="share" size={18} />
            </span>
            <span className="row-label">Export backup</span>
          </button>
          <button type="button" className="row" onClick={reload}>
            <span className="row-icon">
              <Icon name="refresh" size={18} />
            </span>
            <span className="row-label">Refresh from server</span>
          </button>
        </Group>

        <Group header="About">
          <div className="row">
            <span className="row-label">App version</span>
            <span className="row-value">{config.appVersion}</span>
          </div>
          <div className="row">
            <span className="row-label">Database version</span>
            <span className="row-value">{schemaVersion ?? 'Unknown'}</span>
          </div>
        </Group>

        <Group>
          <button type="button" className="row row-danger row-center" onClick={confirmSignOut}>
            Sign out
          </button>
        </Group>
      </main>
    </div>
  );
}
