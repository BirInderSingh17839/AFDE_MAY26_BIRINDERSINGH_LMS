import { NavLink } from 'react-router-dom';
import { useState } from 'react';

const items = [
  { to: '/',             label: 'Dashboard',    icon: '🏠' },
  { to: '/books',        label: 'Books',        icon: '📚' },
  { to: '/borrowers',    label: 'Borrowers',    icon: '👥' },
  { to: '/transactions', label: 'Transactions', icon: '🔄' },
  { to: '/search',       label: 'Search',       icon: '🔍' },
];

export default function Sidebar() {
  const [pinned, setPinned] = useState(false);

  return (
    <aside className={`sidebar ${pinned ? 'expanded' : ''}`}>
      <div
        className="brand"
        onClick={() => setPinned(p => !p)}
        style={{ cursor: 'pointer' }}
        title={pinned ? 'Click to collapse' : 'Click to pin open'}
      >
        <div className="logo">📖</div>
        <div className="brand-text">
          <span className="name">LibraryMS</span>
          <span className="sub">Management Portal</span>
        </div>
      </div>
      <nav>
        {items.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} title={item.label}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div>Made with 💜 · v1.0</div>
      </div>
    </aside>
  );
}
