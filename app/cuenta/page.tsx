import { Suspense } from "react";
import { LogoutButton } from "@/components/auth-forms";
import { getSessionUser } from "@/lib/auth/session";

async function Cuenta() {
  const usuario = await getSessionUser();
  if (!usuario) {
    return <p role="alert">No autorizado.</p>;
  }

  return (
    <section className="flex flex-col gap-4">
      <p>
        Sesión activa para <span>{usuario.email}</span>
      </p>
      <p>
        Rol: <span>{usuario.rol}</span>
      </p>
      <LogoutButton />
    </section>
  );
}

export default function CuentaPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold">Tu cuenta</h1>
      <Suspense fallback={<p>Cargando sesión…</p>}>
        <Cuenta />
      </Suspense>
    </main>
  );
}
