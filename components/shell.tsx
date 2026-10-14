import Link from "next/link";

export function SiteHeader({ nav }: { nav: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white shadow-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link href="/" className="flex items-center gap-3 text-navy">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-navy text-sm font-semibold text-white">
            BA
          </span>
          <span className="leading-tight">
            <span className="block text-base font-semibold tracking-tight">BookingApp</span>
            <span className="block text-xs text-muted">Salas de estudio</span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1" aria-label="Principal">
          {nav}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>BookingApp</p>
        <p>Acceso para estudiantes, profesores y administradores.</p>
      </div>
    </footer>
  );
}

export function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-sm sm:p-8">{children}</div>
  );
}
