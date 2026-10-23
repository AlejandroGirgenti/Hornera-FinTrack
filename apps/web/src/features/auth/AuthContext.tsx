import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from '@fintrack/shared';
import { refreshSession, setAccessToken, setSessionExpiredHandler } from '../../lib/api';
import { loginRequest, logoutRequest, registerRequest } from './auth-api';

type Status = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: AuthUser | null;
  status: Status;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  const applySession = useCallback((session: AuthResponse) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('unauthenticated');
    queryClient.clear(); // los datos en caché son de la sesión anterior
  }, [queryClient]);

  // Al abrir la app se intenta recuperar la sesión con el refresh token (cookie httpOnly).
  // refreshSession comparte una sola llamada aunque React ejecute este efecto dos veces.
  useEffect(() => {
    setSessionExpiredHandler(clearSession);
    let active = true;

    refreshSession()
      .then((session) => {
        if (active) applySession(session);
      })
      .catch(() => {
        if (active) clearSession();
      });

    return () => {
      active = false;
    };
  }, [applySession, clearSession]);

  const login = useCallback(
    async (input: LoginInput) => applySession(await loginRequest(input)),
    [applySession],
  );

  const register = useCallback(
    async (input: RegisterInput) => applySession(await registerRequest(input)),
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearSession(); // aunque falle la llamada, la sesión local se cierra
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}
