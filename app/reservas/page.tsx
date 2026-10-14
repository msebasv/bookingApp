import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CancelReservationForm, CreateReservationForm } from "@/components/reservation-forms";
import { Panel } from "@/components/shell";
import { BOGOTA_TIME_ZONE, ROLE_ADMINISTRADOR } from "@/lib/auth/constants";
import { listReservationsForSession, listSchedulesForRooms } from "@/lib/reservations/queries";
import {
  MSG_RESERVATIONS_EMPTY,
  RESERVATION_CONFIRMED,
} from "@/lib/reservations/validation";
import { listRoomsForSession } from "@/lib/rooms/queries";
import { ROOM_ACTIVE } from "@/lib/rooms/validation";

const bogotaFormat = new Intl.DateTimeFormat("es-CO", {
  timeZone: BOGOTA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function formatWhen(value: Date) {
  return bogotaFormat.format(value);
}

async function ReservationBoard() {
  const result = await listReservationsForSession();
  if (!result) {
    redirect("/ingreso");
  }

  const catalog = await listRoomsForSession();
  if (!catalog) {
    redirect("/ingreso");
  }

  const { usuario, reservations } = result;
  const isAdmin = usuario.rol === ROLE_ADMINISTRADOR;
  const activeRooms = catalog.rooms.filter((room) => room.estado === ROOM_ACTIVE);
  const horarios = await listSchedulesForRooms(activeRooms.map((room) => room.id));
  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <Panel>
        <CreateReservationForm
          rooms={activeRooms.map((room) => ({ id: room.id, codigo: room.codigo, nombre: room.nombre }))}
          horarios={horarios.map((horario) => ({
            salaId: horario.salaId,
            dia: horario.dia,
            aperturaMinuto: horario.aperturaMinuto,
            cierreMinuto: horario.cierreMinuto,
          }))}
        />
      </Panel>
      {reservations.length === 0 ? (
        <Panel>
          <p className="text-sm text-muted">{MSG_RESERVATIONS_EMPTY}</p>
        </Panel>
      ) : (
        <ul className="flex flex-col gap-4">
          {reservations.map((reservation) => {
            const own = reservation.usuarioId === usuario.id;
            const cancellable =
              reservation.estado === RESERVATION_CONFIRMED &&
              reservation.inicio.getTime() > now.getTime() &&
              (isAdmin || own);
            return (
              <li key={reservation.id}>
                <article
                  aria-label={`Reserva ${reservation.id}`}
                  className="rounded-lg border border-line bg-white p-5 shadow-sm sm:p-8"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <h2 className="text-xl font-semibold tracking-tight text-navy">{reservation.sala.nombre}</h2>
                      <p className="text-sm font-semibold text-ink">{reservation.estado}</p>
                    </div>
                    <p className="text-sm text-muted">Código: {reservation.sala.codigo}</p>
                    <p className="text-sm text-ink">Inicio: {formatWhen(reservation.inicio)}</p>
                    <p className="text-sm text-ink">Fin: {formatWhen(reservation.fin)}</p>
                    <p className="text-sm text-ink">Correo: {reservation.usuario.email}</p>
                    {cancellable ? <CancelReservationForm id={reservation.id} /> : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function ReservasPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-blue">Agenda</p>
        <h1 className="text-3xl font-semibold tracking-tight text-navy">Reservas</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted">
          Una reserva confirmada dura 60 minutos. Estudiantes y profesores consultan las suyas. El administrador
          consulta todas.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted">Cargando reservas…</p>}>
        <ReservationBoard />
      </Suspense>
    </main>
  );
}
