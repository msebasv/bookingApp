"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  ASSIGNABLE_ROLES,
  ROLE_ADMINISTRADOR,
  ROLE_ESTUDIANTE,
} from "@/lib/auth/constants";
import { hashPassword, passwordIsLongEnough, passwordMatches } from "@/lib/auth/password";
import { createSession, destroySession, getSessionUser } from "@/lib/auth/session";

export type AuthState = { error: string } | null;

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function emailOf(formData: FormData) {
  return text(formData, "email").toLowerCase();
}

export async function register(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = emailOf(formData);
  const password = text(formData, "password");

  if (!email.includes("@")) {
    return { error: "El correo no es válido." };
  }

  if (!passwordIsLongEnough(password)) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const existing = await prisma.usuario.findUnique({ where: { email } });
  if (existing) {
    return { error: "Ese correo ya está registrado." };
  }

  await prisma.usuario.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      rol: ROLE_ESTUDIANTE,
    },
  });

  redirect("/ingreso?registrado=1");
}

export async function login(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = emailOf(formData);
  const password = text(formData, "password");
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  if (!usuario || !(await passwordMatches(password, usuario.passwordHash))) {
    return { error: "Correo o contraseña incorrectos." };
  }

  await createSession(usuario.id);
  redirect("/cuenta");
}

export async function logout() {
  await destroySession();
  redirect("/ingreso");
}

export async function assignRole(_state: AuthState, formData: FormData): Promise<AuthState> {
  const actor = await getSessionUser();
  if (!actor) {
    return { error: "Debes iniciar sesión." };
  }
  if (actor.rol !== ROLE_ADMINISTRADOR) {
    return { error: "No autorizado." };
  }

  const rol = text(formData, "rol");
  if (rol === ROLE_ADMINISTRADOR || !ASSIGNABLE_ROLES.includes(rol as (typeof ASSIGNABLE_ROLES)[number])) {
    return { error: "No se puede asignar el rol Administrador." };
  }

  const email = emailOf(formData);
  const target = await prisma.usuario.findUnique({ where: { email } });
  if (!target) {
    return { error: "Usuario no encontrado." };
  }
  if (target.id === actor.id) {
    return { error: "No puedes cambiar tu propio rol." };
  }

  await prisma.usuario.update({
    where: { id: target.id },
    data: { rol },
  });

  return { error: "" };
}
