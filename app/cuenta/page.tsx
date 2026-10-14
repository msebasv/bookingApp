import { Suspense } from "react";
import { LogoutButton } from "@/components/auth-forms";
import { Panel } from "@/components/shell";
import { getSessionUser } from "@/lib/auth/session";

async function Cuenta() {
  const usuario = await getSessionUser();
  if (!usuario) {
    return (
      <p role="alert" className="rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
        No autorizado.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted">Sesión activa para {usuario.email}</p>
        <p className="text-sm text-ink">
          Rol: <span className="font-semibold text-navy">{usuario.rol}</span>
        </p>
      </div>
      <LogoutButton />
    </section>
  );
}

export default function CuentaPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-10 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-blue">Sesión</p>
        <h1 className="text-3xl font-semibold tracking-tight text-navy">Tu cuenta</h1>
      </div>
      <Panel>
        <Suspense fallback={<p className="text-sm text-muted">Cargando sesión…</p>}>
          <Cuenta />
        </Suspense>
      </Panel>
    </main>
  );
}
