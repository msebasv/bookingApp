"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ROLE_ADMINISTRADOR } from "@/lib/auth/constants";
import { getSessionUser } from "@/lib/auth/session";
import { RESERVATION_CANCELLED } from "@/lib/reservations/validation";
import {
  MSG_ACTIVATED,
  MSG_CODE_TAKEN,
  MSG_CREATED,
  MSG_DEACTIVATED,
  MSG_DEACTIVATION_BLOCKED,
  MSG_FORBIDDEN,
  MSG_LOGIN,
  MSG_NOT_FOUND,
  MSG_STATE,
  MSG_UPDATED,
  ROOM_ACTIVE,
  ROOM_INACTIVE,
  readRoomForm,
  validateRoomFields,
} from "@/lib/rooms/validation";

export type RoomFormState = { error: string; notice: string } | null;

function failure(error: string): RoomFormState {
  return { error, notice: "" };
}

function success(notice: string): RoomFormState {
  return { error: "", notice };
}

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function requireAdmin(): Promise<{ error: string } | { ok: true }> {
  const usuario = await getSessionUser();
  if (!usuario) {
    return { error: MSG_LOGIN };
  }
  if (usuario.rol !== ROLE_ADMINISTRADOR) {
    return { error: MSG_FORBIDDEN };
  }
  return { ok: true };
}

export async function createRoom(_state: RoomFormState, formData: FormData): Promise<RoomFormState> {
  const access = await requireAdmin();
  if ("error" in access) {
    return failure(access.error);
  }

  const checked = validateRoomFields(readRoomForm(formData));
  if ("error" in checked) {
    return failure(checked.error);
  }

  try {
    await prisma.sala.create({
      data: {
        ...checked.data,
        estado: ROOM_ACTIVE,
      },
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return failure(MSG_CODE_TAKEN);
    }
    throw error;
  }

  revalidatePath("/salas");
  return success(MSG_CREATED);
}

export async function updateRoom(_state: RoomFormState, formData: FormData): Promise<RoomFormState> {
  const access = await requireAdmin();
  if ("error" in access) {
    return failure(access.error);
  }

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return failure(MSG_NOT_FOUND);
  }

  const checked = validateRoomFields(readRoomForm(formData));
  if ("error" in checked) {
    return failure(checked.error);
  }

  const current = await prisma.sala.findUnique({ where: { id } });
  if (!current) {
    return failure(MSG_NOT_FOUND);
  }

  try {
    await prisma.sala.update({
      where: { id },
      data: checked.data,
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return failure(MSG_CODE_TAKEN);
    }
    throw error;
  }

  revalidatePath("/salas");
  return success(MSG_UPDATED);
}

export async function setRoomState(_state: RoomFormState, formData: FormData): Promise<RoomFormState> {
  const access = await requireAdmin();
  if ("error" in access) {
    return failure(access.error);
  }

  const id = formData.get("id");
  const estado = formData.get("estado");
  if (typeof id !== "string" || !id) {
    return failure(MSG_NOT_FOUND);
  }
  if (estado !== ROOM_ACTIVE && estado !== ROOM_INACTIVE) {
    return failure(MSG_STATE);
  }

  if (estado === ROOM_INACTIVE) {
    const now = new Date();
    const outcome = await prisma.$transaction(async (tx): Promise<{ error: string } | { deactivated: true }> => {
      const current = await tx.sala.findUnique({ where: { id }, select: { id: true } });
      if (!current) {
        return { error: MSG_NOT_FOUND };
      }
      const openReservation = await tx.reserva.findFirst({
        where: {
          salaId: id,
          estado: { not: RESERVATION_CANCELLED },
          fin: { gt: now },
        },
        select: { id: true },
      });
      if (openReservation) {
        return { error: MSG_DEACTIVATION_BLOCKED };
      }
      await tx.sala.update({ where: { id }, data: { estado: ROOM_INACTIVE } });
      return { deactivated: true };
    });
    if ("error" in outcome) {
      return failure(outcome.error);
    }
    revalidatePath("/salas");
    return success(MSG_DEACTIVATED);
  }

  const current = await prisma.sala.findUnique({ where: { id } });
  if (!current) {
    return failure(MSG_NOT_FOUND);
  }

  await prisma.sala.update({
    where: { id },
    data: { estado: ROOM_ACTIVE },
  });

  revalidatePath("/salas");
  return success(MSG_ACTIVATED);
}
