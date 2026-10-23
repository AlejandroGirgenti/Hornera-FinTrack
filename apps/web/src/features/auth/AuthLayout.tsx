import type { ReactNode } from 'react';
import { Card } from '../../components/ui/Card';
import { ThemeToggle } from '../../components/ui/ThemeToggle';

export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
            FinTrack
          </p>
          <h1 className="mt-2 text-lg font-semibold">{title}</h1>
        </div>
        <Card>{children}</Card>
      </div>
    </main>
  );
}
