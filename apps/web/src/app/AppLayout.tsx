import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Logo, LogoMark } from '../components/Logo';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { useAuth } from '../features/auth/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Panel', end: true },
  { to: '/movimientos', label: 'Movimientos', end: false },
  { to: '/categorias', label: 'Categorías', end: false },
  { to: '/presupuestos', label: 'Presupuestos', end: false },
  { to: '/configuracion', label: 'Configuración', end: false },
];

/** Menú desplegable del celular: el botón es el logo y la lista trae la navegación y la cuenta. */
function MobileMenu() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Al navegar a otra pantalla el menú se cierra solo
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Hornera FinTrack, menú de navegación"
        className="-ml-1 inline-flex items-center gap-2 rounded-xl p-1 pr-2 transition-colors hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-accent-500 dark:hover:bg-white/10"
      >
        <LogoMark className="size-9" />
        <span className="text-base font-semibold tracking-tight">
          Hornera <span className="font-bold text-accent-600 dark:text-accent-300">FinTrack</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`size-4 text-slate-500 transition-transform dark:text-slate-400 ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          id={menuId}
          className="surface-solid absolute left-0 top-full z-30 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl p-2"
        >
          <nav aria-label="Principal" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-11 items-center rounded-xl px-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-200'
                      : 'text-slate-700 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-white/10'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-2 border-t border-slate-200/70 px-1 pt-3 dark:border-white/10">
            {user && (
              <p className="mb-3 truncate px-2 text-xs text-slate-500 dark:text-slate-400">
                {user.name} · {user.email}
              </p>
            )}
            <Button variant="secondary" className="w-full" onClick={() => void logout()}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AppLayout() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-600 focus:shadow dark:focus:bg-slate-900 dark:focus:text-accent-400"
      >
        Saltar al contenido
      </a>
      <header className="glass-strong sticky top-0 z-20 rounded-none border-x-0 border-t-0">
        {/* Celular y tablet: el logo abre el menú; el cambio de tema queda a mano */}
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 lg:hidden">
          <MobileMenu />
          <ThemeToggle />
        </div>

        {/* Escritorio: marca a la izquierda, navegación al centro, tema y cuenta a la derecha */}
        <div className="mx-auto hidden max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3 lg:grid">
          <Link to="/" aria-label="Hornera FinTrack, ir al panel" className="justify-self-start">
            <Logo />
          </Link>
          <nav aria-label="Principal" className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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
          <div className="flex items-center justify-end gap-3">
            <ThemeToggle />
            <Button variant="secondary" onClick={() => void logout()}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>
      <main id="contenido" className="mx-auto max-w-5xl px-4 py-5 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
