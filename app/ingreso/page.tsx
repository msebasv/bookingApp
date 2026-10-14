import { Suspense } from "react";
import { LoginForm } from "@/components/auth-forms";

async function RegistrationNotice({
  searchParams,
}: {
  searchParams: Promise<{ registrado?: string }>;
}) {
  const params = await searchParams;
  if (params.registrado !== "1") {
    return null;
  }
  return <p>Cuenta creada. Ya puedes iniciar sesión.</p>;
}

export default function IngresoPage({
  searchParams,
}: {
  searchParams: Promise<{ registrado?: string }>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold">Iniciar sesión</h1>
      <Suspense>
        <RegistrationNotice searchParams={searchParams} />
      </Suspense>
      <LoginForm />
    </main>
  );
}
