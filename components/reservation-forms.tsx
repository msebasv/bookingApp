"use client";

import { useState, type FormEvent } from "react";
import { useActionState } from "react";
import { minuteLabel, MSG_DAY_CLOSED, MSG_NO_COMPATIBLE_START, MSG_PICK_DATE, MSG_WEEKEND_NOTE, startOffer } from "@/lib/reservations/consultation";
import { cancelReservation, createReservation } from "@/lib/reservations/actions";
import { isRuleError, readBogotaClock } from "@/lib/reservations/time";
import {
  MSG_INSTANT,
  MSG_NO_HOURS,
  MSG_ROOM_REQUIRED,
  MSG_WEEKDAY_RANGE,
  parseBogotaDateTime,
  validateReservation,
} from "@/lib/reservations/validation";

const fieldClass =
  "h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-blue focus:ring-2 focus:ring-blue/20";

const WEEK_DAYS = [
  { dia: 1, label: "Lunes" },
  { dia: 2, label: "Martes" },
  { dia: 3, label: "Miércoles" },
  { dia: 4, label: "Jueves" },
  { dia: 5, label: "Viernes" },
  { dia: 6, label: "Sábado" },
  { dia: 7, label: "Domingo" },
] as const;

function Alert({ error }: { error: string }) {
  if (!error) {
    return null;
  }
  return (
    <p role="alert" className="rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
      {error}
    </p>
  );
}

function Notice({ notice }: { notice: string }) {
  if (!notice) {
    return null;
  }
  return <p className="rounded-md border border-ok/20 bg-ok-soft px-3 py-2 text-sm text-ok">{notice}</p>;
}

export function CreateReservationForm({
  rooms,
  horarios,
}: {
  rooms: { id: string; codigo: string; nombre: string }[];
  horarios: { salaId: string; dia: number; aperturaMinuto: number; cierreMinuto: number }[];
}) {
  const [salaId, setSalaId] = useState("");
  const [fecha, setFecha] = useState("");
  const [localError, setLocalError] = useState("");
  const [state, formAction, pending] = useActionState(createReservation, null);
  const roomHours = horarios.filter((horario) => horario.salaId === salaId);
  const inicio = fecha ? parseBogotaDateTime(fecha, "00:00") : null;
  const clock = inicio ? readBogotaClock(inicio) : null;
  const weekday = clock && !isRuleError(clock) ? clock.data.weekday : null;
  const saved = weekday === null ? null : roomHours.find((horario) => horario.dia === weekday) ?? null;
  const offer = startOffer(
    salaId && fecha ? weekday : null,
    saved ? { aperturaMinuto: saved.aperturaMinuto, cierreMinuto: saved.cierreMinuto } : null,
  );
  const startHint =
    offer.reason === "date"
      ? MSG_PICK_DATE
      : offer.reason === "weekend"
        ? MSG_WEEKDAY_RANGE
        : offer.reason === "closed"
          ? MSG_NO_HOURS
          : offer.reason === "short"
            ? MSG_NO_COMPATIBLE_START
            : "Elige una hora de inicio. La reserva dura 60 minutos.";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    if (String(form.get("id") ?? "").trim() || String(form.get("reservaId") ?? "").trim()) {
      return;
    }
    const selectedRoom = String(form.get("salaId") ?? "");
    if (!selectedRoom) {
      event.preventDefault();
      setLocalError(MSG_ROOM_REQUIRED);
      return;
    }
    const start = parseBogotaDateTime(String(form.get("fecha") ?? ""), String(form.get("hora") ?? ""));
    if (!start) {
      event.preventDefault();
      setLocalError(MSG_INSTANT);
      return;
    }
    const rawDuration = String(form.get("duracion") ?? "").trim();
    const duration = rawDuration === "" ? undefined : Number(rawDuration);
    const startClock = readBogotaClock(start);
    if (isRuleError(startClock)) {
      event.preventDefault();
      setLocalError(startClock.error);
      return;
    }
    const day = horarios.find((horario) => horario.salaId === selectedRoom && horario.dia === startClock.data.weekday);
    const checked = validateReservation({
      inicio: start,
      now: new Date(),
      duration,
      schedule: day ? { aperturaMinuto: day.aperturaMinuto, cierreMinuto: day.cierreMinuto } : null,
    });
    if ("error" in checked) {
      event.preventDefault();
      setLocalError(checked.error);
      return;
    }
    setLocalError("");
  }

  const error = localError || state?.error || "";
  const notice = localError ? "" : state?.notice || "";

  return (
    <form id="crear-reserva" action={formAction} onSubmit={onSubmit} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-ink" htmlFor="reserva-sala">
          Sala
        </label>
        <select
          id="reserva-sala"
          className={fieldClass}
          name="salaId"
          required
          value={salaId}
          onChange={(event) => setSalaId(event.target.value)}
        >
          <option value="" disabled>
            Elige una sala
          </option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.codigo}
            </option>
          ))}
        </select>
      </div>
      <section aria-label="Horario de la sala" className="rounded-md border border-line bg-white px-3 py-3">
        {salaId ? (
          <ul className="flex flex-col gap-1">
            {WEEK_DAYS.map((day) => {
              const hours = roomHours.find((horario) => horario.dia === day.dia);
              return (
                <li key={day.dia} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-ink">{day.label}</span>
                  <span className="text-muted">
                    {hours ? `${minuteLabel(hours.aperturaMinuto)}–${minuteLabel(hours.cierreMinuto)}` : MSG_DAY_CLOSED}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">Elige una sala para ver su horario.</p>
        )}
        <p className="mt-2 text-xs leading-5 text-muted">{MSG_WEEKEND_NOTE}</p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink" htmlFor="reserva-fecha">
            Fecha
          </label>
          <input
            id="reserva-fecha"
            className={fieldClass}
            name="fecha"
            type="date"
            required
            value={fecha}
            onChange={(event) => setFecha(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink" htmlFor="reserva-hora">
            Hora
          </label>
          <select
            id="reserva-hora"
            key={`${salaId}-${fecha}`}
            className={fieldClass}
            name="hora"
            required={offer.starts.length > 0}
            defaultValue=""
          >
            <option value="" disabled>
              Elige una hora
            </option>
            {offer.starts.map((minute) => {
              const label = minuteLabel(minute);
              return (
                <option key={label} value={label}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>
      </div>
      <p className="text-xs font-normal text-muted">{startHint}</p>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-ink" htmlFor="reserva-duracion">
          Duración
        </label>
        <input id="reserva-duracion" className={fieldClass} name="duracion" type="number" min={1} step={1} />
        <p className="text-xs font-normal text-muted">Opcional. Si la omites, la reserva dura 60 minutos.</p>
      </div>
      <Alert error={error} />
      <Notice notice={notice} />
      <button
        className="inline-flex h-11 items-center justify-center rounded-md bg-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-blue disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={pending}
      >
        Confirmar reserva
      </button>
    </form>
  );
}

export function CancelReservationForm({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(cancelReservation, null);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <Alert error={state?.error ?? ""} />
      <Notice notice={state?.notice ?? ""} />
      <button
        className="inline-flex h-11 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-navy transition-colors hover:bg-blue-soft disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={pending}
      >
        Cancelar reserva
      </button>
    </form>
  );
}
