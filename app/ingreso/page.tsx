import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";
import { Panel } from "@/components/shell";

async function RegistrationNotice({
  searchParams,
}: {
  searchParams: Promise<{ registrado?: string }>;
}) {
  const params = await searchParams;
  if (params.registrado !== "1") {
    return null;
  }
  return (
    <p className="rounded-md border border-ok/20 bg-ok-soft px-3 py-2 text-sm text-ok">
      Cuenta creada. Ya puedes iniciar sesión.
    </p>
  );
}

export default function IngresoPage({
  searchParams,
}: {
  searchParams: Promise<{ registrado?: string }>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-10 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-blue">Acceso</p>
        <h1 className="text-3xl font-semibold tracking-tight text-navy">Iniciar sesión</h1>
        <p className="text-sm leading-6 text-muted">Usa el correo y la contraseña de tu cuenta.</p>
      </div>
      <Panel>
        <div className="flex flex-col gap-5">
          <Suspense>
            <RegistrationNotice searchParams={searchParams} />
          </Suspense>
          <LoginForm />
          <p className="text-sm text-muted">
            ¿Aún no tienes cuenta?{" "}
            <Link href="/registro" className="font-semibold text-blue hover:text-navy">
              Regístrate
            </Link>
          </p>
        </div>
      </Panel>
    </main>
  );
}
