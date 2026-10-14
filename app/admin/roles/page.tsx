import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AssignRoleForm } from "@/components/auth-forms";
import { Panel } from "@/components/shell";
import { ROLE_ADMINISTRADOR } from "@/lib/auth/constants";
import { getSessionUser } from "@/lib/auth/session";

async function AdminRoles() {
  const usuario = await getSessionUser();
  if (!usuario) {
    redirect("/ingreso");
  }
  if (usuario.rol !== ROLE_ADMINISTRADOR) {
    return (
      <p role="alert" className="rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
        No autorizado.
      </p>
    );
  }
  return <AssignRoleForm />;
}

export default function RolesPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-10 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-blue">Administración</p>
        <h1 className="text-3xl font-semibold tracking-tight text-navy">Asignar rol</h1>
        <p className="text-sm leading-6 text-muted">
          Un administrador puede asignar estudiante o profesor a otra cuenta.
        </p>
      </div>
      <Panel>
        <Suspense fallback={<p className="text-sm text-muted">Cargando sesión…</p>}>
          <AdminRoles />
        </Suspense>
      </Panel>
    </main>
  );
}
