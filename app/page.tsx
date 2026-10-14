import { Suspense } from "react";
import Link from "next/link";
import { ROLE_ADMINISTRADOR } from "@/lib/auth/constants";
import { getSessionUser } from "@/lib/auth/session";

const points = [
  {
    title: "Salas",
    text: "Consulta los espacios de estudio activos, con su ubicación y su capacidad.",
  },
  {
    title: "Horarios",
    text: "Cada sala muestra su apertura y su cierre antes de elegir una hora.",
  },
  {
    title: "Reservas",
    text: "Reserva una franja libre. La confirmación dura 60 minutos.",
  },
];

function EntryLink({ href, label, primary }: { href: string; label: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "inline-flex h-11 items-center justify-center rounded-md bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-blue"
          : "inline-flex h-11 items-center justify-center rounded-md border border-line bg-white px-5 text-sm font-semibold text-navy transition-colors hover:bg-blue-soft"
      }
    >
      {label}
    </Link>
  );
}

function VisitorHome() {
  return (
    <>
      <section className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col gap-5">
          <p className="text-sm font-semibold tracking-wide text-accent">Plataforma universitaria</p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl">
            Consulta espacios de estudio y resérvalos
          </h1>
          <p className="max-w-xl text-base leading-7 text-muted sm:text-lg">
            BookingApp permite ver las salas disponibles, su horario y reservar una franja cuando hay
            lugar.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <EntryLink href="/ingreso" label="Ingresar" primary />
            <EntryLink href="/registro" label="Crear cuenta" />
          </div>
        </div>
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-navy">Qué puedes hacer</p>
          <ul className="mt-4 flex flex-col gap-4">
            {points.map((point) => (
              <li key={point.title} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
                <p className="text-sm font-semibold text-ink">{point.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{point.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

function Shortcut({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Link href={href} className="rounded-xl border border-line bg-white p-5 shadow-sm transition-colors hover:border-blue">
      <p className="text-base font-semibold text-navy">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
    </Link>
  );
}

async function HomeForSession() {
  const usuario = await getSessionUser();
  if (!usuario) {
    return <VisitorHome />;
  }

  const isAdmin = usuario.rol === ROLE_ADMINISTRADOR;
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold tracking-wide text-blue">Sesión de {usuario.rol.toLowerCase()}</p>
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl">
          Continúa con tus espacios de estudio
        </h1>
        <p className="max-w-xl text-base leading-7 text-muted">
          Estos son los accesos de tu rol. El correo de la sesión está en el encabezado.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Shortcut href="/salas" title="Salas" text="Consulta el catálogo que tu rol puede ver." />
        <Shortcut href="/reservas" title="Reservas" text="Revisa la agenda y tus reservas confirmadas." />
        {isAdmin ? <Shortcut href="/admin/roles" title="Roles" text="Asigna estudiante o profesor a otra cuenta." /> : null}
        <Shortcut href="/cuenta" title="Mi cuenta" text="Consulta el rol de esta sesión y ciérrala." />
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 sm:py-16">
      <Suspense fallback={<p className="text-sm text-muted">Cargando inicio…</p>}>
        <HomeForSession />
      </Suspense>
    </main>
  );
}
