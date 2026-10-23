import { Route, Routes } from 'react-router';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { GuestRoute, ProtectedRoute } from '../features/auth/routes';
import { CategoriesPage } from '../features/categories/CategoriesPage';
import { TransactionsPage } from '../features/transactions/TransactionsPage';
import { AppLayout } from './AppLayout';
import { NotFoundPage } from './NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="movimientos" element={<TransactionsPage />} />
          <Route path="categorias" element={<CategoriesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
