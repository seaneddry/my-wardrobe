/**
 * Browsing a list from a piece's page (previous / next piece).
 *
 * A list page (Wardrobe, For Sale, an outfit) passes the ids it is showing, in order,
 * as router state when a piece is opened. The piece page steps through that list and
 * hands the same state on, so Back still returns straight to the list.
 *
 * The list is a snapshot of what was on screen, so it stays stable while you browse
 * (marking a piece as sold doesn't make it jump out of the list). Deleted pieces are skipped.
 */

export type BrowseState = { browse: string[] };

/** Router state for a link to a piece opened from a list. */
export function browseState(ids: string[]): BrowseState {
  return { browse: ids };
}

/** The list a piece page was opened from, if any. */
export function readBrowse(state: unknown): string[] | null {
  const ids = (state as Partial<BrowseState> | null)?.browse;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : null;
}

const STEP_KEY = 'browse-last';

/** Remember the piece we stepped to, so the list can scroll to it on the way back. */
export function rememberStep(id: string) {
  try {
    sessionStorage.setItem(STEP_KEY, id);
  } catch {
    /* ignore */
  }
}

/** The piece last stepped to (cleared once read), or null if you didn't step. */
export function takeStep(): string | null {
  try {
    const id = sessionStorage.getItem(STEP_KEY);
    sessionStorage.removeItem(STEP_KEY);
    return id;
  } catch {
    return null;
  }
}

/** Scrolls a list row or card for the given piece into view. Returns false if it isn't on the page. */
export function scrollToPiece(id: string): boolean {
  const el = document.querySelector(`[data-item-id="${CSS.escape(id)}"]`);
  if (!el) return false;
  el.scrollIntoView({ block: 'center' });
  return true;
}
