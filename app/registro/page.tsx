import Link from "next/link";
import { RegisterForm } from "@/components/auth-forms";
import { Panel } from "@/components/shell";

export default function RegistroPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-10 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-blue">Registro</p>
        <h1 className="text-3xl font-semibold tracking-tight text-navy">Crear cuenta</h1>
        <p className="text-sm leading-6 text-muted">
          El registro público crea una cuenta de estudiante.
        </p>
      </div>
      <Panel>
        <div className="flex flex-col gap-5">
          <RegisterForm />
          <p className="text-sm text-muted">
            ¿Ya tienes cuenta?{" "}
            <Link href="/ingreso" className="font-semibold text-blue hover:text-navy">
              Ingresa
            </Link>
          </p>
        </div>
      </Panel>
    </main>
  );
}
