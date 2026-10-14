"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ROLE_ADMINISTRADOR } from "@/lib/auth/constants";
import { getSessionUser } from "@/lib/auth/session";
import { scheduleForRoomDay } from "@/lib/reservations/queries";
import { isRuleError, readBogotaClock } from "@/lib/reservations/time";
import { ROOM_ACTIVE } from "@/lib/rooms/validation";
import {
  MSG_ALREADY_CANCELLED,
  MSG_CANCEL_TOO_LATE,
  MSG_DURATION,
  MSG_INACTIVE_ROOM,
  MSG_INSTANT,
  MSG_NO_EDIT,
  MSG_OVERLAP,
  MSG_RESERVATION_BUSY,
  MSG_RESERVATION_CANCELLED,
  MSG_RESERVATION_CREATED,
  MSG_RESERVATION_FORBIDDEN,
  MSG_RESERVATION_MISSING,
  MSG_ROOM_REQUIRED,
  MSG_SCHEDULE_CLEARED,
  MSG_SCHEDULE_FORBIDDEN,
  MSG_SCHEDULE_LOGIN,
  MSG_SCHEDULE_ROOM,
  MSG_SCHEDULE_SAVED,
  RESERVATION_CANCELLED,
  RESERVATION_CONFIRMED,
  canCancel,
  parseBogotaDateTime,
  readDaySchedule,
  validateReservation,
} from "@/lib/reservations/validation";

export type ScheduleFormState = { error: string; notice: string } | null;

function failure(error: string): ScheduleFormState {
  return { error, notice: "" };
}

function success(notice: string): ScheduleFormState {
  return { error: "", notice };
}

export async function saveRoomDaySchedule(
  _state: ScheduleFormState,
  formData: FormData,
): Promise<ScheduleFormState> {
  const usuario = await getSessionUser();
  if (!usuario) {
    return failure(MSG_SCHEDULE_LOGIN);
  }
  if (usuario.rol !== ROLE_ADMINISTRADOR) {
    return failure(MSG_SCHEDULE_FORBIDDEN);
  }

  const salaId = formData.get("salaId");
  if (typeof salaId !== "string" || !salaId) {
    return failure(MSG_SCHEDULE_ROOM);
  }

  const checked = readDaySchedule({
    dia: String(formData.get("dia") ?? ""),
    apertura: String(formData.get("apertura") ?? ""),
    cierre: String(formData.get("cierre") ?? ""),
  });
  if ("error" in checked) {
    return failure(checked.error);
  }

  const outcome = await prisma.$transaction(async (tx): Promise<{ error: string } | { cleared: boolean }> => {
    const room = await tx.sala.findUnique({ where: { id: salaId }, select: { id: true } });
    if (!room) {
      return { error: MSG_SCHEDULE_ROOM };
    }

    const current = await scheduleForRoomDay(salaId, checked.data.dia, tx);
    if (!checked.data.schedule) {
      if (current) {
        await tx.horarioSala.delete({ where: { id: current.id } });
      }
      return { cleared: true as const };
    }

    if (current) {
      await tx.horarioSala.update({
        where: { id: current.id },
        data: {
          aperturaMinuto: checked.data.schedule.aperturaMinuto,
          cierreMinuto: checked.data.schedule.cierreMinuto,
        },
      });
    } else {
      await tx.horarioSala.create({
        data: {
          salaId,
          dia: checked.data.dia,
          aperturaMinuto: checked.data.schedule.aperturaMinuto,
          cierreMinuto: checked.data.schedule.cierreMinuto,
        },
      });
    }
    return { cleared: false as const };
  });

  if ("error" in outcome) {
    return failure(outcome.error);
  }

  revalidatePath("/salas");
  return success(outcome.cleared ? MSG_SCHEDULE_CLEARED : MSG_SCHEDULE_SAVED);
}

export type ReservationFormState = { error: string; notice: string } | null;

function reservationFailure(error: string): ReservationFormState {
  return { error, notice: "" };
}

function reservationSuccess(notice: string): ReservationFormState {
  return { error: "", notice };
}

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function isTransactionWait(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2028";
}

function isSqliteBusy(error: unknown) {
  if (isUniqueConflict(error) || isTransactionWait(error)) {
    return false;
  }
  const message = error instanceof Error ? error.message : "";
  return message.includes("SQLITE_BUSY") || message.includes("database is locked");
}

function isConnectorTimeout(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P1008";
}

function reservationTransactionLimits(): { maxWait: number; timeout: number } | undefined {
  const raw = process.env.BOOKINGAPP_RESERVATION_TX_MS;
  if (!raw) {
    return undefined;
  }
  const ms = Number(raw);
  if (!Number.isInteger(ms) || ms < 1) {
    return undefined;
  }
  return { maxWait: ms, timeout: ms };
}

function readDuration(value: FormDataEntryValue | null): { error: string } | { duration?: number } {
  if (typeof value !== "string" || value.trim() === "") {
    return {};
  }
  if (!/^\d+$/.test(value.trim())) {
    return { error: MSG_DURATION };
  }
  return { duration: Number(value.trim()) };
}

export async function createReservation(
  _state: ReservationFormState,
  formData: FormData,
): Promise<ReservationFormState> {
  const usuario = await getSessionUser();
  if (!usuario) {
    redirect("/ingreso");
  }

  const edited = formData.get("id") ?? formData.get("reservaId");
  if (typeof edited === "string" && edited.trim() !== "") {
    return reservationFailure(MSG_NO_EDIT);
  }

  const salaId = formData.get("salaId");
  if (typeof salaId !== "string" || !salaId) {
    return reservationFailure(MSG_ROOM_REQUIRED);
  }

  const inicio = parseBogotaDateTime(String(formData.get("fecha") ?? ""), String(formData.get("hora") ?? ""));
  if (!inicio) {
    return reservationFailure(MSG_INSTANT);
  }

  const duration = readDuration(formData.get("duracion"));
  if ("error" in duration) {
    return reservationFailure(duration.error);
  }

  const now = new Date();
  const limits = reservationTransactionLimits();
  try {
    const outcome = await prisma.$transaction(async (tx): Promise<{ error: string } | { created: true }> => {
      const room = await tx.sala.findUnique({ where: { id: salaId }, select: { id: true, estado: true } });
      if (!room) {
        return { error: MSG_SCHEDULE_ROOM };
      }
      if (room.estado !== ROOM_ACTIVE) {
        return { error: MSG_INACTIVE_ROOM };
      }

      const clock = readBogotaClock(inicio);
      if (isRuleError(clock)) {
        return clock;
      }
      const horario = await scheduleForRoomDay(salaId, clock.data.weekday, tx);
      const checked = validateReservation({
        inicio,
        now,
        duration: duration.duration,
        schedule: horario
          ? { aperturaMinuto: horario.aperturaMinuto, cierreMinuto: horario.cierreMinuto }
          : null,
      });
      if (isRuleError(checked)) {
        return checked;
      }

      await tx.reserva.create({
        data: {
          salaId,
          usuarioId: usuario.id,
          inicio: checked.data.inicio,
          fin: checked.data.fin,
          estado: RESERVATION_CONFIRMED,
          ocupaciones: {
            create: checked.data.occupancy.map((instante) => ({ salaId, instante })),
          },
        },
      });
      return { created: true };
    }, limits);

    if ("error" in outcome) {
      return reservationFailure(outcome.error);
    }
  } catch (error) {
    if (isUniqueConflict(error)) {
      return reservationFailure(MSG_OVERLAP);
    }
    if (isTransactionWait(error) || isSqliteBusy(error) || isConnectorTimeout(error)) {
      return reservationFailure(MSG_RESERVATION_BUSY);
    }
    throw error;
  }

  revalidatePath("/reservas");
  return reservationSuccess(MSG_RESERVATION_CREATED);
}

export async function cancelReservation(
  _state: ReservationFormState,
  formData: FormData,
): Promise<ReservationFormState> {
  const usuario = await getSessionUser();
  if (!usuario) {
    redirect("/ingreso");
  }

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return reservationFailure(MSG_RESERVATION_MISSING);
  }

  const now = new Date();
  const outcome = await prisma.$transaction(async (tx): Promise<{ error: string } | { cancelled: true }> => {
    const current = await tx.reserva.findUnique({ where: { id } });
    if (!current) {
      return { error: MSG_RESERVATION_MISSING };
    }
    if (usuario.rol !== ROLE_ADMINISTRADOR && current.usuarioId !== usuario.id) {
      return { error: MSG_RESERVATION_FORBIDDEN };
    }
    if (current.estado !== RESERVATION_CONFIRMED) {
      return { error: MSG_ALREADY_CANCELLED };
    }
    const decision = canCancel(current.inicio, now);
    if (isRuleError(decision) || !decision.data.allowed) {
      return { error: MSG_CANCEL_TOO_LATE };
    }

    await tx.reservaOcupacion.deleteMany({ where: { reservaId: current.id } });
    await tx.reserva.update({
      where: { id: current.id },
      data: { estado: RESERVATION_CANCELLED },
    });
    return { cancelled: true };
  });

  if ("error" in outcome) {
    return reservationFailure(outcome.error);
  }

  revalidatePath("/reservas");
  return reservationSuccess(MSG_RESERVATION_CANCELLED);
}
