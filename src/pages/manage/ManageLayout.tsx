import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { NavBar } from '../../components/NavBar';
import { Group } from '../../components/Group';
import { Icon } from '../../components/Icon';
import { config } from '../../config';
import { LOOKUP_LISTS } from '../../data/types';
import { LIST_INFO } from '../../lib/manage';
import { useData } from '../../state/data';

/**
 * The Manage section. Desktop: navigation on the left, editor on the right.
 * Phone: the navigation is its own screen, and each editor opens full width.
 */
export function ManageLayout() {
  const { lookups, allFields, schemaVersion, schemaBehind } = useData();
  const location = useLocation();
  const inSection = location.pathname !== '/manage';

  return (
    <div className="screen">
      <NavBar
        large
        title="Manage"
        subtitle="Lists and custom fields"
        left={
          inSection ? (
            <Link to="/manage" className="nav-button">
              <Icon name="back" size={22} weight={2.4} /> Manage
            </Link>
          ) : (
            <Link to="/settings" viewTransition className="nav-button">
              <Icon name="back" size={22} weight={2.4} /> Settings
            </Link>
          )
        }
      />
      <div className={`manage${inSection ? ' manage-in-section' : ''}`}>
        <nav className="manage-nav" aria-label="Manage">
          {schemaBehind && (
            <p className="notice notice-error">
              The database is on version {schemaVersion} and this screen needs version {config.requiredSchema}. Run{' '}
              <code>supabase/migrations/002_manage_functions.sql</code> once in the Supabase SQL Editor (see{' '}
              <code>docs/UPGRADING.md</code>).
            </p>
          )}
          <Group header="Lists">
            {LOOKUP_LISTS.map((list) => (
              <NavLink key={list} to={`/manage/lists/${list}`} className="manage-nav-link">
                <span>{LIST_INFO[list].title}</span>
                <span className="manage-nav-count">{lookups(list).length}</span>
                <Icon name="chevron" size={16} weight={2.4} />
              </NavLink>
            ))}
          </Group>
          <Group header="Item form">
            <NavLink to="/manage/fields" className="manage-nav-link">
              <span>Custom fields</span>
              <span className="manage-nav-count">{allFields.length}</span>
              <Icon name="chevron" size={16} weight={2.4} />
            </NavLink>
          </Group>
        </nav>
        <main className="manage-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function ManageIntro() {
  return (
    <div className="manage-intro">
      <h2 className="manage-title">Choose what to edit</h2>
      <p>
        Pick a list or the custom fields on the left. Changes save straight away and appear on your phone the next time
        you open the app.
      </p>
    </div>
  );
}

/** Kept for compatibility; the navigation bar now provides the way back. */
export function BackToManage() {
  return null;
}
