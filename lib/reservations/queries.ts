import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ROLE_ADMINISTRADOR } from "@/lib/auth/constants";
import { getSessionUser } from "@/lib/auth/session";
import { agendaForDay, reservationListFilter, reservationWhere } from "@/lib/reservations/consultation";
import { isRuleError, readBogotaClock } from "@/lib/reservations/time";
import { parseBogotaDateTime } from "@/lib/reservations/validation";

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

export async function listReservationsForSession(filterValue: string | undefined, now?: Date) {
  const usuario = await getSessionUser();
  if (!usuario) {
    return null;
  }

  const clock = now ?? new Date();
  const filter = reservationListFilter(filterValue);
  const scope = usuario.rol === ROLE_ADMINISTRADOR ? {} : { usuarioId: usuario.id };
  const reservations = await prisma.reserva.findMany({
    where: { AND: [scope, reservationWhere(filter, clock)] },
    include: {
      sala: { select: { id: true, nombre: true, codigo: true } },
      usuario: { select: { id: true, email: true } },
    },
    orderBy: [{ inicio: "asc" }, { id: "asc" }],
  });
  return { usuario, reservations, filter, now: clock };
}

export async function availabilityForRoomDay(salaId: string, fecha: string) {
  const inicio = parseBogotaDateTime(fecha, "00:00");
  if (!inicio) {
    return { error: "fecha" as const };
  }
  const clock = readBogotaClock(inicio);
  if (isRuleError(clock)) {
    return { error: "fecha" as const };
  }

  const schedule = await scheduleForRoomDay(salaId, clock.data.weekday);
  const hours = schedule ? { aperturaMinuto: schedule.aperturaMinuto, cierreMinuto: schedule.cierreMinuto } : null;
  if (clock.data.weekday >= 6 || !hours) {
    return { error: null, view: agendaForDay(clock.data.weekday, hours, []) };
  }

  const dayEnd = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
  const rows = await prisma.reservaOcupacion.findMany({
    where: { salaId, instante: { gte: inicio, lt: dayEnd } },
    select: { instante: true },
  });
  const occupiedMinutes = rows.flatMap((row) => {
    const occupied = readBogotaClock(row.instante);
    return isRuleError(occupied) ? [] : [occupied.data.minuteOfDay];
  });
  return { error: null, view: agendaForDay(clock.data.weekday, hours, occupiedMinutes) };
}
