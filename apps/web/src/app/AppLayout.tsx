import { Link, NavLink, Outlet } from 'react-router';
import { Logo } from '../components/Logo';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { useAuth } from '../features/auth/AuthContext';

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-600 focus:shadow dark:focus:bg-slate-900 dark:focus:text-accent-400"
      >
        Saltar al contenido
      </a>
      <header className="glass-strong sticky top-0 z-20 rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link to="/" aria-label="Hornera FinTrack, ir al panel">
            <Logo hideNameOnMobile />
          </Link>
          <nav
            aria-label="Principal"
            className="order-last -mx-1 flex w-full items-center gap-1 overflow-x-auto px-1 sm:order-none sm:mx-0 sm:w-auto sm:flex-1 sm:px-0"
          >
            {[
              { to: '/', label: 'Panel', end: true },
              { to: '/movimientos', label: 'Movimientos', end: false },
              { to: '/categorias', label: 'Categorías', end: false },
              { to: '/configuracion', label: 'Configuración', end: false },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-200'
                      : 'text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10'
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
              <span className="sm:hidden">Salir</span>
              <span className="hidden sm:inline">Cerrar sesión</span>
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
