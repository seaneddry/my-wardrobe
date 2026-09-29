import { NavLink, useLocation } from 'react-router-dom';
import { Icon } from './Icon';

export function TabBar() {
  const { pathname } = useLocation();
  const on = {
    wardrobe: pathname === '/' || pathname.startsWith('/item'),
    outfits: pathname.startsWith('/outfits'),
    stylist: pathname.startsWith('/stylist'),
    settings: pathname.startsWith('/settings') || pathname.startsWith('/manage'),
  };
  return (
    <nav className="tabbar" aria-label="Main">
      <NavLink to="/" viewTransition className={`tab${on.wardrobe ? ' active' : ''}`}>
        <Icon name="hanger" size={25} weight={on.wardrobe ? 2.1 : 1.7} />
        <span>Wardrobe</span>
      </NavLink>
      <NavLink to="/outfits" viewTransition className={`tab${on.outfits ? ' active' : ''}`}>
        <Icon name="layers" size={24} weight={on.outfits ? 2.1 : 1.7} />
        <span>Outfits</span>
      </NavLink>
      <NavLink to="/add" viewTransition className="tab tab-add" aria-label="Add a piece">
        <span className="tab-add-button">
          <Icon name="plus" size={24} weight={2.2} />
        </span>
      </NavLink>
      <NavLink to="/stylist" viewTransition className={`tab${on.stylist ? ' active' : ''}`}>
        <Icon name="sparkles" size={24} weight={on.stylist ? 2.1 : 1.7} />
        <span>Stylist</span>
      </NavLink>
      <NavLink to="/settings" viewTransition className={`tab${on.settings ? ' active' : ''}`}>
        <Icon name="settings" size={24} weight={on.settings ? 2 : 1.6} />
        <span>Settings</span>
      </NavLink>
    </nav>
  );
}
