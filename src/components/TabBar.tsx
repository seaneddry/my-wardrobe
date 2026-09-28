import { NavLink } from 'react-router-dom';
import { Icon } from './Icon';

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      <NavLink to="/" end className="tab">
        <Icon name="hanger" />
        <span>Wardrobe</span>
      </NavLink>
      <NavLink to="/add" className="tab tab-add" aria-label="Add piece">
        <span className="tab-add-circle">
          <Icon name="plus" size={26} />
        </span>
      </NavLink>
      <NavLink to="/settings" className="tab">
        <Icon name="settings" />
        <span>Settings</span>
      </NavLink>
    </nav>
  );
}
