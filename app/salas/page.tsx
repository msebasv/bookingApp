import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CreateRoomForm, EditRoomForm, RoomScheduleForm, RoomStateForm } from "@/components/room-forms";
import { Panel } from "@/components/shell";
import { ROLE_ADMINISTRADOR } from "@/lib/auth/constants";
import { listSchedulesForRooms } from "@/lib/reservations/queries";
import { listRoomsForSession } from "@/lib/rooms/queries";
import { MSG_EMPTY, ROOM_ACTIVE } from "@/lib/rooms/validation";

async function RoomCatalog() {
  const result = await listRoomsForSession();
  if (!result) {
    redirect("/ingreso");
  }

  const { usuario, rooms } = result;
  const isAdmin = usuario.rol === ROLE_ADMINISTRADOR;
  const schedules = isAdmin ? await listSchedulesForRooms(rooms.map((room) => room.id)) : [];

  return (
    <div className="flex flex-col gap-6">
      {isAdmin ? (
        <Panel>
          <CreateRoomForm />
        </Panel>
      ) : null}
      {rooms.length === 0 ? (
        <Panel>
          <p className="text-sm text-muted">{MSG_EMPTY}</p>
        </Panel>
      ) : (
        <ul className="flex flex-col gap-4">
          {rooms.map((room) => (
            <li key={room.id}>
              <article aria-label={room.codigo} className="rounded-lg border border-line bg-white p-5 shadow-sm sm:p-8">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-col gap-1">
                      <h2 className="text-xl font-semibold tracking-tight text-navy">{room.nombre}</h2>
                      <p className="text-sm text-muted">Código: {room.codigo}</p>
                    </div>
                    <p className="text-sm font-semibold text-ink">{room.estado === ROOM_ACTIVE ? "Activa" : "Inactiva"}</p>
                  </div>
                  <p className="text-sm text-ink">Ubicación: {room.ubicacion}</p>
                  <p className="text-sm text-ink">Capacidad: {room.capacidad}</p>
                  {room.descripcion ? <p className="text-sm leading-6 text-muted">{room.descripcion}</p> : null}
                  {isAdmin ? (
                    <div className="flex flex-col gap-6 border-t border-line pt-4">
                      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
                        <EditRoomForm room={room} />
                        <RoomStateForm id={room.id} estado={room.estado} />
                      </div>
                      <RoomScheduleForm
                        salaId={room.id}
                        horarios={schedules.filter((horario) => horario.salaId === room.id)}
                      />
                    </div>
                  ) : null}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SalasPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-blue">Catálogo</p>
        <h1 className="text-3xl font-semibold tracking-tight text-navy">Salas</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted">
          El administrador consulta todas las salas. Estudiantes y profesores consultan las que están activas.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted">Cargando salas…</p>}>
        <RoomCatalog />
      </Suspense>
    </main>
  );
}
