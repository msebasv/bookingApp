import Link from "next/link";
import { logout } from "@/lib/auth/actions";
import { ROLE_ADMINISTRADOR } from "@/lib/auth/constants";
import { getSessionUser } from "@/lib/auth/session";

const linkClass =
  "inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-ink transition-colors hover:bg-blue-soft hover:text-navy";

function Icon({ path }: { path: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const icons = {
  inicio: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z",
  ingresar: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3",
  cuenta: "M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  salas: "M4 20V8l8-4 8 4v12M9 20v-6h6v6",
  reservas: "M8 3v3M16 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2",
  roles: "M12 3l2.2 4.5L19 8.2l-3.5 3.4.8 4.8L12 14.8 7.7 16.4l.8-4.8L5 8.2l4.8-.7z",
};

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link href={href} className={linkClass}>
      <Icon path={icon} />
      {label}
    </Link>
  );
}

export function PublicNavFallback() {
  return <NavLink href="/" label="Inicio" icon={icons.inicio} />;
}

export async function SessionNav() {
  const usuario = await getSessionUser();
  const links = !usuario
    ? [
        { href: "/", label: "Inicio", icon: icons.inicio },
        { href: "/ingreso", label: "Ingresar", icon: icons.ingresar },
        { href: "/registro", label: "Crear cuenta", icon: icons.cuenta },
      ]
    : [
        { href: "/", label: "Inicio", icon: icons.inicio },
        { href: "/salas", label: "Salas", icon: icons.salas },
        { href: "/reservas", label: "Reservas", icon: icons.reservas },
        ...(usuario.rol === ROLE_ADMINISTRADOR
          ? [{ href: "/admin/roles", label: "Roles", icon: icons.roles }]
          : []),
        { href: "/cuenta", label: "Mi cuenta", icon: icons.cuenta },
      ];

  return (
    <>
      {links.map((link) => (
        <NavLink key={link.href} href={link.href} label={link.label} icon={link.icon} />
      ))}
      {usuario ? (
        <div className="flex flex-wrap items-center gap-2 sm:ml-1 sm:border-l sm:border-line sm:pl-3">
          <p className="max-w-full break-all px-1 text-xs text-muted">{usuario.email}</p>
          <form action={logout}>
            <button
              className="inline-flex h-10 items-center rounded-md border border-line bg-white px-3 text-sm font-semibold text-navy transition-colors hover:bg-blue-soft"
              type="submit"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
