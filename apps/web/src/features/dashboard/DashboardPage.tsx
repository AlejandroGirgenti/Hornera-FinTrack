import { useState } from 'react';
import { currentMonth } from '../../lib/dates';
import { useAuth } from '../auth/AuthContext';
import { ExpensesBreakdown } from './ExpensesBreakdown';
import { MonthPicker } from './MonthPicker';
import { SummaryCards } from './SummaryCards';
import { TrendChart } from './TrendChart';

export function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.name.split(' ')[0] ?? '';
  const [month, setMonth] = useState(() => currentMonth());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hola, {firstName}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Así van tus finanzas en el mes elegido
          </p>
        </div>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      <SummaryCards month={month} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ExpensesBreakdown month={month} />
        <TrendChart />
      </div>
    </div>
  );
}
