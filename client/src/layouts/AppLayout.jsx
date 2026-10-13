import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/create', label: 'Create test' },
  { to: '/tests', label: 'My tests' },
  { to: '/results', label: 'Results' },
  { to: '/analytics', label: 'Analysis' },
  { to: '/profile', label: 'Profile' },
];

function NavItems({ onNavigate }) {
  return NAV.map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `rounded-lg px-3 py-2 text-[15px] font-medium transition-colors ${
          isActive ? 'bg-exam text-white' : 'text-ink-soft hover:bg-paper-sunken hover:text-ink'
        }`
      }
    >
      {item.label}
    </NavLink>
  ));
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[236px_1fr]">
      <aside className="hidden border-r border-line bg-paper-raised px-4 py-6 lg:flex lg:flex-col">
        <div className="px-3">
          <p className="font-display text-xl font-semibold">Prep<span className="text-blue-800">Matrix</span></p>
          <p className="mt-0.5 text-sm text-ink-faint">Practice from your own material</p>
        </div>
        <nav className="mt-8 flex flex-col gap-1">
          <NavItems />
        </nav>
        <div className="mt-auto border-t border-line px-3 pt-4">
          <p className="truncate text-sm font-semibold">{user?.name}</p>
          <p className="truncate text-xs text-ink-faint">{user?.email}</p>
          <button
            type="button"
            onClick={signOut}
            className="mt-3 text-sm font-semibold text-verdict-wrong hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper-raised px-4 py-3 lg:hidden">
        <p className="font-display text-lg font-semibold">Prep<span className="text-blue-800">Matrix</span></p>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold  "
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>
      </header>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-b border-line bg-paper-raised px-4 py-3 lg:hidden">
          <NavItems onNavigate={() => setMenuOpen(false)} />
          <button
            type="button"
            onClick={signOut}
            className="mt-1 rounded-lg px-3 py-2 text-left text-[15px] font-semibold text-verdict-wrong"
          >
            Sign out
          </button>
        </nav>
      )}

      <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
