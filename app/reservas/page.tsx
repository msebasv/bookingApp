import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CancelReservationForm, CreateReservationForm } from "@/components/reservation-forms";
import { Panel } from "@/components/shell";
import { BOGOTA_TIME_ZONE, ROLE_ADMINISTRADOR } from "@/lib/auth/constants";
import { minuteLabel, MSG_DAY_CLOSED } from "@/lib/reservations/consultation";
import { availabilityForRoomDay, listReservationsForSession, listSchedulesForRooms } from "@/lib/reservations/queries";
import {
  MSG_INSTANT,
  MSG_RESERVATIONS_EMPTY,
  MSG_WEEKDAY_RANGE,
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

const FILTERS = [
  { id: "proximas", label: "Próximas" },
  { id: "pasadas", label: "Pasadas" },
  { id: "canceladas", label: "Canceladas" },
] as const;

function formatWhen(value: Date) {
  return bogotaFormat.format(value);
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function reservaHref(vista: string, agendaSala?: string, agendaFecha?: string) {
  const query = new URLSearchParams();
  query.set("vista", vista);
  if (agendaSala) {
    query.set("agendaSala", agendaSala);
  }
  if (agendaFecha) {
    query.set("agendaFecha", agendaFecha);
  }
  return `/reservas?${query.toString()}`;
}

async function ReservationBoard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const result = await listReservationsForSession(one(params.vista));
  if (!result) {
    redirect("/ingreso");
  }

  const catalog = await listRoomsForSession();
  if (!catalog) {
    redirect("/ingreso");
  }

  const { usuario, reservations, filter, now } = result;
  const isAdmin = usuario.rol === ROLE_ADMINISTRADOR;
  const activeRooms = catalog.rooms.filter((room) => room.estado === ROOM_ACTIVE);
  const horarios = await listSchedulesForRooms(activeRooms.map((room) => room.id));
  const agendaSala = one(params.agendaSala) ?? "";
  const agendaFecha = one(params.agendaFecha) ?? "";
  const selectedRoom = activeRooms.find((room) => room.id === agendaSala) ?? null;
  const availability = selectedRoom && agendaFecha ? await availabilityForRoomDay(selectedRoom.id, agendaFecha) : null;

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
      <Panel>
        <form method="get" action="/reservas" aria-label="Disponibilidad" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold tracking-tight text-navy">Disponibilidad</h2>
            <p className="text-sm leading-6 text-muted">Franjas libres y ocupadas, sin datos de quien reservó.</p>
          </div>
          <input type="hidden" name="vista" value={filter} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
              Sala
              <select
                name="agendaSala"
                defaultValue={selectedRoom?.id ?? ""}
                className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink"
              >
                <option value="">Elige una sala</option>
                {activeRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.codigo}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
              Fecha
              <input
                name="agendaFecha"
                type="date"
                defaultValue={agendaFecha}
                className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink"
              />
            </label>
          </div>
          <button
            className="inline-flex h-11 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-navy transition-colors hover:bg-blue-soft"
            type="submit"
          >
            Consultar disponibilidad
          </button>
          {availability?.error === "fecha" ? <p className="text-sm text-muted">{MSG_INSTANT}</p> : null}
          {availability && !availability.error && availability.view.kind === "weekend" ? (
            <p className="text-sm text-ink">{MSG_WEEKDAY_RANGE}</p>
          ) : null}
          {availability && !availability.error && availability.view.kind === "closed" ? (
            <p className="text-sm text-ink">{MSG_DAY_CLOSED}</p>
          ) : null}
          {availability && !availability.error && availability.view.kind === "bands" ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {availability.view.bands.map((band) => (
                <li
                  key={band.startMinute}
                  className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-sm"
                >
                  <span className="text-ink">
                    {minuteLabel(band.startMinute)}–{minuteLabel(band.startMinute + 30)}
                  </span>
                  <span className="font-semibold text-navy">{band.state === "ocupada" ? "Ocupada" : "Libre"}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </form>
      </Panel>
      <nav aria-label="Filtro de reservas" className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Link
            key={item.id}
            href={reservaHref(item.id, selectedRoom?.id, agendaFecha)}
            aria-current={item.id === filter ? "page" : undefined}
            className="inline-flex h-11 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-navy transition-colors hover:bg-blue-soft aria-[current=page]:bg-navy aria-[current=page]:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
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

export default function ReservasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
        <ReservationBoard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
