import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Dumbbell, CreditCard, Snowflake, QrCode,
  Receipt, Users, ShieldCheck, ClipboardList, ScanLine,
  LogOut, Menu, X, Sun, Moon
} from 'lucide-react';

const memberLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/facilities', icon: Dumbbell, label: 'Facilities' },
  { to: '/memberships', icon: CreditCard, label: 'My Memberships' },
  { to: '/payments', icon: Receipt, label: 'Payments' },
  { to: '/card', icon: QrCode, label: 'My Card' },
  { to: '/freeze', icon: Snowflake, label: 'Freeze Request' },
];

const adminLinks = [
  { to: '/admin', icon: ShieldCheck, label: 'Admin Dashboard' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/audit', icon: ClipboardList, label: 'Audit Logs' },
];

const trainerLinks = [
  { to: '/trainer', icon: ScanLine, label: 'Gate Scanner' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">🏅</div>
          <div>
            <div className="sidebar-brand-text">NUST Sports</div>
            <div className="sidebar-brand-sub">Facility Portal</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* Member Links — always shown */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">Member</div>
            {memberLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <link.icon size={16} />
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Trainer Links */}
          {(user?.role === 'TRAINER' || user?.role === 'ADMIN') && (
            <div className="sidebar-section">
              <div className="sidebar-section-title">Trainer</div>
              {trainerLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={closeSidebar}
                >
                  <link.icon size={16} />
                  {link.label}
                </NavLink>
              ))}
            </div>
          )}

          {/* Admin Links */}
          {user?.role === 'ADMIN' && (
            <div className="sidebar-section">
              <div className="sidebar-section-title">Administration</div>
              {adminLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={closeSidebar}
                >
                  <link.icon size={16} />
                  {link.label}
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        {/* User Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.fullName || 'User'}</div>
              <div className="sidebar-user-role">{user?.role?.toLowerCase()}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button className="sidebar-logout" style={{ flex: 1, width: 'auto' }} onClick={handleLogout}>
              <LogOut size={15} />
              Sign Out
            </button>
            <button
              onClick={() => setIsDark(!isDark)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 'var(--radius-md)',
                color: 'rgba(240,244,248,0.6)',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
              title={isDark ? "Switch to Light Mode" : "Switch to Night Mode"}
              type="button"
            >
              {isDark ? <Sun size={15} color="var(--brass)" /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,0.55)', zIndex: 99, backdropFilter: 'blur(2px)' }}
          onClick={closeSidebar}
        />
      )}

      <main className="main-content">
        {children}
      </main>

      <button className="mobile-nav-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle navigation">
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
    </div>
  );
}
