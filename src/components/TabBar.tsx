import { NavLink, useLocation } from 'react-router-dom';
import { Icon } from './Icon';

export function TabBar() {
  const { pathname } = useLocation();
  const onWardrobe = pathname === '/' || pathname.startsWith('/item');
  const onSettings = pathname.startsWith('/settings') || pathname.startsWith('/manage');
  return (
    <nav className="tabbar" aria-label="Main">
      <NavLink to="/" viewTransition className={`tab${onWardrobe ? ' active' : ''}`}>
        <Icon name="hanger" size={25} weight={onWardrobe ? 2.1 : 1.7} />
        <span>Wardrobe</span>
      </NavLink>
      <NavLink to="/add" viewTransition className="tab tab-add" aria-label="Add a piece">
        <span className="tab-add-button">
          <Icon name="plus" size={24} weight={2.2} />
        </span>
      </NavLink>
      <NavLink to="/settings" viewTransition className={`tab${onSettings ? ' active' : ''}`}>
        <Icon name="settings" size={25} weight={onSettings ? 2 : 1.6} />
        <span>Settings</span>
      </NavLink>
    </nav>
  );
}
