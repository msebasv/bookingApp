"use client";

import { useActionState } from "react";
import {
  assignRole,
  login,
  logout,
  register,
  type AuthState,
} from "@/lib/auth/actions";

function Field({
  label,
  name,
  type,
}: {
  label: string;
  name: string;
  type: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        className="rounded border border-black/15 px-3 py-2"
        name={name}
        type={type}
        required
      />
    </label>
  );
}

function ErrorText({ state }: { state: AuthState }) {
  if (!state?.error) {
    return null;
  }
  return (
    <p role="alert" className="text-sm text-red-700">
      {state.error}
    </p>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, null);
  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <Field label="Correo" name="email" type="email" />
      <Field label="Contraseña" name="password" type="password" />
      <ErrorText state={state} />
      <button
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        type="submit"
        disabled={pending}
      >
        Crear cuenta
      </button>
    </form>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <Field label="Correo" name="email" type="email" />
      <Field label="Contraseña" name="password" type="password" />
      <ErrorText state={state} />
      <button
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        type="submit"
        disabled={pending}
      >
        Iniciar sesión
      </button>
    </form>
  );
}

export function LogoutButton() {
  return (
    <form action={logout}>
      <button className="rounded border px-4 py-2" type="submit">
        Cerrar sesión
      </button>
    </form>
  );
}

export function AssignRoleForm() {
  const [state, action, pending] = useActionState(assignRole, null);
  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <Field label="Correo del usuario" name="email" type="email" />
      <label className="flex flex-col gap-1 text-sm">
        Rol
        <select className="rounded border border-black/15 px-3 py-2" name="rol" defaultValue="PROFESOR">
          <option value="ESTUDIANTE">Estudiante</option>
          <option value="PROFESOR">Profesor</option>
        </select>
      </label>
      <ErrorText state={state} />
      {state?.error === "" ? <p>Rol actualizado.</p> : null}
      <button
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        type="submit"
        disabled={pending}
      >
        Asignar rol
      </button>
    </form>
  );
}
