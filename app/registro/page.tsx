import { RegisterForm } from "@/components/auth-forms";

export default function RegistroPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold">Crear cuenta</h1>
      <RegisterForm />
    </main>
  );
}
