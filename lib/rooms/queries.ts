import { prisma } from "@/lib/db";
import { ROLE_ADMINISTRADOR } from "@/lib/auth/constants";
import { getSessionUser } from "@/lib/auth/session";
import { ROOM_ACTIVE } from "@/lib/rooms/validation";

export async function listRoomsForSession() {
  const usuario = await getSessionUser();
  if (!usuario) {
    return null;
  }

  const rooms = await prisma.sala.findMany({
    where: usuario.rol === ROLE_ADMINISTRADOR ? {} : { estado: ROOM_ACTIVE },
  });
  rooms.sort((left, right) => left.nombre.localeCompare(right.nombre, "es", { sensitivity: "base" }));
  return { usuario, rooms };
}
