import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthContext';

function FullScreenMessage({ children }: { children: string }) {
  return (
    <div
      role="status"
      className="flex min-h-screen items-center justify-center text-sm text-slate-500 dark:text-slate-400"
    >
      {children}
    </div>
  );
}

/** Deja pasar solo a usuarios con sesión; el resto va al login y vuelve a donde estaba después. */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullScreenMessage>Cargando…</FullScreenMessage>;
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

/** Para login y registro: si ya hay sesión, lleva directo a la app. */
export function GuestRoute() {
  const { status } = useAuth();

  if (status === 'loading') return <FullScreenMessage>Cargando…</FullScreenMessage>;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <Outlet />;
}
