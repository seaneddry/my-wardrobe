import { NavLink, useLocation } from 'react-router-dom';
import { Icon } from './Icon';

/** Floating glass capsule with the main screens, plus a round Add button (same layout as Garage). */
export function TabBar() {
  const { pathname } = useLocation();
  const on = {
    wardrobe: pathname === '/' || pathname.startsWith('/item'),
    outfits: pathname.startsWith('/outfits'),
    stylist: pathname.startsWith('/stylist'),
    sale: pathname.startsWith('/sale'),
    settings: pathname.startsWith('/settings') || pathname.startsWith('/manage'),
  };
  const tab = (active: boolean) => `tab${active ? ' active' : ''}`;
  return (
    <nav className="tabbar" aria-label="Main">
      <div className="tab-capsule">
        <NavLink to="/" viewTransition className={tab(on.wardrobe)}>
          <Icon name="hanger" size={24} weight={on.wardrobe ? 2.1 : 1.7} />
          <span>Wardrobe</span>
        </NavLink>
        <NavLink to="/outfits" viewTransition className={tab(on.outfits)}>
          <Icon name="layers" size={23} weight={on.outfits ? 2.1 : 1.7} />
          <span>Outfits</span>
        </NavLink>
        <NavLink to="/stylist" viewTransition className={tab(on.stylist)}>
          <Icon name="sparkles" size={23} weight={on.stylist ? 2.1 : 1.7} />
          <span>Stylist</span>
        </NavLink>
        <NavLink to="/sale" viewTransition className={tab(on.sale)}>
          <Icon name="tag" size={23} weight={on.sale ? 2.1 : 1.7} />
          <span>For Sale</span>
        </NavLink>
        <NavLink to="/settings" viewTransition className={tab(on.settings)}>
          <Icon name="settings" size={23} weight={on.settings ? 2 : 1.6} />
          <span>Settings</span>
        </NavLink>
      </div>
      <NavLink to={on.sale ? '/sale/add' : '/add'} viewTransition className="tab-fab" aria-label={on.sale ? 'Add a piece to sell' : 'Add a piece'}>
        <Icon name="plus" size={26} weight={2.2} />
      </NavLink>
    </nav>
  );
}
