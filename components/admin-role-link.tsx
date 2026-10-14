import Link from "next/link";
import { ROLE_ADMINISTRADOR } from "@/lib/auth/constants";
import { getSessionUser } from "@/lib/auth/session";

const linkClass = "rounded-md px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-blue-soft hover:text-navy";

export async function AdminRoleLink() {
  const usuario = await getSessionUser();
  if (!usuario || usuario.rol !== ROLE_ADMINISTRADOR) {
    return null;
  }

  return (
    <Link href="/admin/roles" className={linkClass}>
      Roles
    </Link>
  );
}
