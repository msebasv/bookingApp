import Link from "next/link";

const links = [
  { href: "/ingreso", label: "Ingresar" },
  { href: "/registro", label: "Crear cuenta" },
  { href: "/salas", label: "Salas" },
  { href: "/reservas", label: "Reservas" },
  { href: "/cuenta", label: "Tu cuenta" },
];

export function SiteHeader({ extra }: { extra?: React.ReactNode }) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link href="/" className="flex items-center gap-3 text-navy">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-navy text-sm font-semibold text-white">
            BA
          </span>
          <span className="leading-tight">
            <span className="block text-base font-semibold tracking-tight">BookingApp</span>
            <span className="block text-xs text-muted">Salas de estudio</span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1" aria-label="Principal">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-blue-soft hover:text-navy"
            >
              {link.label}
            </Link>
          ))}
          {extra}
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
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm sm:p-8">{children}</div>
  );
}
