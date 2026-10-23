import { Link, NavLink, Outlet } from 'react-router';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { useAuth } from '../features/auth/AuthContext';

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-indigo-600 focus:shadow dark:focus:bg-slate-900 dark:focus:text-indigo-400"
      >
        Saltar al contenido
      </a>
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link
            to="/"
            className="text-lg font-bold tracking-tight text-indigo-600 dark:text-indigo-400"
          >
            FinTrack
          </Link>
          <nav
            aria-label="Principal"
            className="order-last flex w-full items-center gap-1 sm:order-none sm:w-auto sm:flex-1"
          >
            {[
              { to: '/', label: 'Panel', end: true },
              { to: '/movimientos', label: 'Movimientos', end: false },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline dark:text-slate-300">
              {user?.name}
            </span>
            <ThemeToggle />
            <Button variant="secondary" onClick={() => void logout()}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>
      <main id="contenido" className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
