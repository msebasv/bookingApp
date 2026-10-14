"use client";

import { useState, type FormEvent } from "react";
import { useActionState } from "react";
import { cancelReservation, createReservation } from "@/lib/reservations/actions";
import { isRuleError, readBogotaClock } from "@/lib/reservations/time";
import { MSG_INSTANT, MSG_ROOM_REQUIRED, parseBogotaDateTime, validateReservation } from "@/lib/reservations/validation";

const fieldClass =
  "h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-blue focus:ring-2 focus:ring-blue/20";

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
  const [localError, setLocalError] = useState("");
  const [state, formAction, pending] = useActionState(createReservation, null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    if (String(form.get("id") ?? "").trim() || String(form.get("reservaId") ?? "").trim()) {
      return;
    }
    const salaId = String(form.get("salaId") ?? "");
    if (!salaId) {
      event.preventDefault();
      setLocalError(MSG_ROOM_REQUIRED);
      return;
    }
    const inicio = parseBogotaDateTime(String(form.get("fecha") ?? ""), String(form.get("hora") ?? ""));
    if (!inicio) {
      event.preventDefault();
      setLocalError(MSG_INSTANT);
      return;
    }
    const rawDuration = String(form.get("duracion") ?? "").trim();
    const duration = rawDuration === "" ? undefined : Number(rawDuration);
    const clock = readBogotaClock(inicio);
    if (isRuleError(clock)) {
      event.preventDefault();
      setLocalError(clock.error);
      return;
    }
    const saved = horarios.find((horario) => horario.salaId === salaId && horario.dia === clock.data.weekday);
    const checked = validateReservation({
      inicio,
      now: new Date(),
      duration,
      schedule: saved ? { aperturaMinuto: saved.aperturaMinuto, cierreMinuto: saved.cierreMinuto } : null,
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
        <select id="reserva-sala" className={fieldClass} name="salaId" required defaultValue="">
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink" htmlFor="reserva-fecha">
            Fecha
          </label>
          <input id="reserva-fecha" className={fieldClass} name="fecha" type="date" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink" htmlFor="reserva-hora">
            Hora
          </label>
          <input id="reserva-hora" className={fieldClass} name="hora" type="time" required />
        </div>
      </div>
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
