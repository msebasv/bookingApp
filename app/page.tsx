import Link from "next/link";

const points = [
  {
    title: "Registro de estudiante",
    text: "La cuenta pública se crea con correo y contraseña. El rol inicial es estudiante.",
  },
  {
    title: "Sesión en el servidor",
    text: "El ingreso abre una sesión de 12 horas. Cerrarla deja de autorizar la cuenta.",
  },
  {
    title: "Roles en el servidor",
    text: "Un administrador asigna profesor o estudiante. El registro público no crea administradores.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 sm:py-16">
      <section className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col gap-5">
          <p className="text-sm font-semibold tracking-wide text-blue">Plataforma universitaria</p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl">
            Acceso claro para reservar salas de estudio
          </h1>
          <p className="max-w-xl text-base leading-7 text-muted sm:text-lg">
            BookingApp reúne el ingreso, el registro y la asignación de roles de estudiantes,
            profesores y administradores.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/ingreso"
              className="inline-flex h-11 items-center justify-center rounded-md bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-blue"
            >
              Ingresar
            </Link>
            <Link
              href="/registro"
              className="inline-flex h-11 items-center justify-center rounded-md border border-line bg-white px-5 text-sm font-semibold text-navy transition-colors hover:bg-blue-soft"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
        <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-navy">Qué puedes hacer ahora</p>
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
    </main>
  );
}
