import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ROLE_ADMINISTRADOR } from "@/lib/auth/constants";
import { getSessionUser } from "@/lib/auth/session";

type ScheduleReader = PrismaClient | Prisma.TransactionClient;

export function listSchedulesForRooms(salaIds: string[]) {
  if (salaIds.length === 0) {
    return Promise.resolve([]);
  }
  return prisma.horarioSala.findMany({
    where: { salaId: { in: salaIds } },
    orderBy: [{ salaId: "asc" }, { dia: "asc" }],
  });
}

export function scheduleForRoomDay(salaId: string, dia: number, db: ScheduleReader = prisma) {
  return db.horarioSala.findUnique({
    where: { salaId_dia: { salaId, dia } },
  });
}

export async function listReservationsForSession() {
  const usuario = await getSessionUser();
  if (!usuario) {
    return null;
  }

  const reservations = await prisma.reserva.findMany({
    where: usuario.rol === ROLE_ADMINISTRADOR ? {} : { usuarioId: usuario.id },
    include: {
      sala: { select: { id: true, nombre: true, codigo: true } },
      usuario: { select: { id: true, email: true } },
    },
    orderBy: [{ inicio: "asc" }, { id: "asc" }],
  });
  return { usuario, reservations };
}
