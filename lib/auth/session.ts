import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, SESSION_HOURS } from "@/lib/auth/constants";
import { sessionExpiry } from "@/lib/auth/time";

export async function createSession(usuarioId: string) {
  const creadoEn = new Date();
  const sesion = await prisma.sesion.create({
    data: {
      usuarioId,
      creadoEn,
      expiraEn: sessionExpiry(creadoEn),
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, sesion.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_HOURS * 60 * 60,
  });

  return sesion;
}

export async function getSessionUser() {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (!sessionId) {
    return null;
  }

  const sesion = await prisma.sesion.findUnique({
    where: { id: sessionId },
    include: { usuario: true },
  });

  if (!sesion) {
    return null;
  }

  if (sesion.expiraEn.getTime() <= Date.now()) {
    await prisma.sesion.delete({ where: { id: sesion.id } }).catch(() => undefined);
    return null;
  }

  return sesion.usuario;
}

export async function destroySession() {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await prisma.sesion.delete({ where: { id: sessionId } }).catch(() => undefined);
  }
  store.delete(SESSION_COOKIE);
}
