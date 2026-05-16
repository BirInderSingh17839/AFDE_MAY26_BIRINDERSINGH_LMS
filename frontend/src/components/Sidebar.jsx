import { NavLink } from 'react-router-dom';

const items = [
  { to: '/',           label: 'Dashboard',     icon: '📊' },
  { to: '/books',      label: 'Books',         icon: '📚' },
  { to: '/borrowers',  label: 'Borrowers',     icon: '👥' },
  { to: '/transactions', label: 'Borrow / Return', icon: '🔄' },
  { to: '/search',     label: 'Search',        icon: '🔍' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">📖</div>
        <div>
          <div>LibraryMS</div>
          <div style={{ fontSize: 11, opacity: .75, fontWeight: 400 }}>Management Portal</div>
        </div>
      </div>
      <nav>
        {items.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}>
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
