import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-5xl font-bold text-accent-600 dark:text-accent-300">404</p>
      <h1 className="text-lg font-semibold">No encontramos esa página</h1>
      <Link
        to="/"
        className="text-sm font-medium text-accent-600 hover:underline dark:text-accent-300"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
