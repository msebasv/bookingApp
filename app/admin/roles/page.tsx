import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AssignRoleForm } from "@/components/auth-forms";
import { ROLE_ADMINISTRADOR } from "@/lib/auth/constants";
import { getSessionUser } from "@/lib/auth/session";

async function AdminRoles() {
  const usuario = await getSessionUser();
  if (!usuario) {
    redirect("/ingreso");
  }
  if (usuario.rol !== ROLE_ADMINISTRADOR) {
    return <p role="alert">No autorizado.</p>;
  }
  return <AssignRoleForm />;
}

export default function RolesPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold">Asignar rol</h1>
      <Suspense fallback={<p>Cargando sesión…</p>}>
        <AdminRoles />
      </Suspense>
    </main>
  );
}
