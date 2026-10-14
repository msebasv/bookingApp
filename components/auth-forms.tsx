"use client";

import { useActionState } from "react";
import {
  assignRole,
  login,
  logout,
  register,
  type AuthState,
} from "@/lib/auth/actions";

const fieldClass =
  "h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-blue focus:ring-2 focus:ring-blue/20";

function Field({
  label,
  name,
  type,
  autoComplete,
  hint,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete: string;
  hint?: string;
}) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        {label}
        <input
          className={fieldClass}
          name={name}
          type={type}
          autoComplete={autoComplete}
          aria-describedby={hintId}
          required
        />
      </label>
      {hint ? (
        <p id={hintId} className="text-xs font-normal text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function ErrorText({ state }: { state: AuthState }) {
  if (!state?.error) {
    return null;
  }
  return (
    <p role="alert" className="rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
      {state.error}
    </p>
  );
}

function SubmitButton({ pending, children }: { pending: boolean; children: string }) {
  return (
    <button
      className="inline-flex h-11 items-center justify-center rounded-md bg-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-blue disabled:cursor-not-allowed disabled:opacity-60"
      type="submit"
      disabled={pending}
    >
      {children}
    </button>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, null);
  return (
    <form action={action} className="flex w-full flex-col gap-4">
      <Field label="Correo" name="email" type="email" autoComplete="email" />
      <Field
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="Mínimo 8 caracteres."
      />
      <ErrorText state={state} />
      <SubmitButton pending={pending}>Crear cuenta</SubmitButton>
    </form>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="flex w-full flex-col gap-4">
      <Field label="Correo" name="email" type="email" autoComplete="email" />
      <Field label="Contraseña" name="password" type="password" autoComplete="current-password" />
      <ErrorText state={state} />
      <SubmitButton pending={pending}>Iniciar sesión</SubmitButton>
    </form>
  );
}

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        className="inline-flex h-11 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-navy transition-colors hover:bg-blue-soft"
        type="submit"
      >
        Cerrar sesión
      </button>
    </form>
  );
}

export function AssignRoleForm() {
  const [state, action, pending] = useActionState(assignRole, null);
  return (
    <form action={action} className="flex w-full flex-col gap-4">
      <Field label="Correo del usuario" name="email" type="email" autoComplete="off" />
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Rol
        <select className={fieldClass} name="rol" defaultValue="PROFESOR">
          <option value="ESTUDIANTE">Estudiante</option>
          <option value="PROFESOR">Profesor</option>
        </select>
      </label>
      <ErrorText state={state} />
      {state?.error === "" ? (
        <p className="rounded-md border border-ok/20 bg-ok-soft px-3 py-2 text-sm text-ok">Rol actualizado.</p>
      ) : null}
      <SubmitButton pending={pending}>Asignar rol</SubmitButton>
    </form>
  );
}
