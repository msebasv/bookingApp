"use client";

import { useState, type FormEvent } from "react";
import { useActionState } from "react";
import { saveRoomDaySchedule } from "@/lib/reservations/actions";
import { readDaySchedule } from "@/lib/reservations/validation";
import { createRoom, setRoomState, updateRoom, type RoomFormState } from "@/lib/rooms/actions";
import {
  ROOM_ACTIVE,
  ROOM_INACTIVE,
  ROOM_CODE_MAX,
  ROOM_DESCRIPTION_MAX,
  ROOM_LOCATION_MAX,
  ROOM_NAME_MAX,
  readRoomForm,
  validateRoomFields,
} from "@/lib/rooms/validation";

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

function TextField({
  label,
  name,
  maxLength,
  defaultValue,
  hint,
  hintId,
}: {
  label: string;
  name: string;
  maxLength: number;
  defaultValue?: string;
  hint: string;
  hintId: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        {label}
        <input
          className={fieldClass}
          name={name}
          type="text"
          maxLength={maxLength}
          defaultValue={defaultValue}
          aria-describedby={hintId}
          required
        />
      </label>
      <p id={hintId} className="text-xs font-normal text-muted">
        {hint}
      </p>
    </div>
  );
}

function RoomFields({
  prefix,
  values,
}: {
  prefix: string;
  values?: { nombre: string; codigo: string; ubicacion: string; capacidad: number; descripcion: string | null };
}) {
  return (
    <>
      <TextField
        label="Nombre"
        name="nombre"
        maxLength={ROOM_NAME_MAX}
        defaultValue={values?.nombre}
        hint="Máximo 100 caracteres."
        hintId={`${prefix}-nombre-hint`}
      />
      <TextField
        label="Código"
        name="codigo"
        maxLength={ROOM_CODE_MAX}
        defaultValue={values?.codigo}
        hint="Máximo 20 caracteres. Único sin distinguir mayúsculas."
        hintId={`${prefix}-codigo-hint`}
      />
      <TextField
        label="Ubicación"
        name="ubicacion"
        maxLength={ROOM_LOCATION_MAX}
        defaultValue={values?.ubicacion}
        hint="Máximo 120 caracteres."
        hintId={`${prefix}-ubicacion-hint`}
      />
      <div className="flex flex-col gap-1.5">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink" htmlFor={`${prefix}-capacidad`}>
          Capacidad
          <input
            id={`${prefix}-capacidad`}
            className={fieldClass}
            name="capacidad"
            type="number"
            min={1}
            step={1}
            defaultValue={values?.capacidad}
            required
          />
        </label>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-ink" htmlFor={`${prefix}-descripcion`}>
          Descripción
        </label>
        <textarea
          id={`${prefix}-descripcion`}
          className="min-h-24 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-blue focus:ring-2 focus:ring-blue/20"
          name="descripcion"
          maxLength={ROOM_DESCRIPTION_MAX}
          defaultValue={values?.descripcion ?? ""}
          aria-describedby={`${prefix}-descripcion-hint`}
        />
        <p id={`${prefix}-descripcion-hint`} className="text-xs font-normal text-muted">
          Opcional. Máximo 500 caracteres.
        </p>
      </div>
    </>
  );
}

function useRoomSubmit(action: (state: RoomFormState, formData: FormData) => Promise<RoomFormState>) {
  const [localError, setLocalError] = useState("");
  const [state, formAction, pending] = useActionState(action, null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const checked = validateRoomFields(readRoomForm(new FormData(event.currentTarget)));
    if ("error" in checked) {
      event.preventDefault();
      setLocalError(checked.error);
      return;
    }
    setLocalError("");
  }

  return {
    formAction,
    pending,
    onSubmit,
    error: localError || state?.error || "",
    notice: localError ? "" : state?.notice || "",
  };
}

export function CreateRoomForm() {
  const { formAction, pending, onSubmit, error, notice } = useRoomSubmit(createRoom);
  return (
    <form id="crear-sala" action={formAction} onSubmit={onSubmit} className="flex w-full flex-col gap-4">
      <RoomFields prefix="crear" />
      <Alert error={error} />
      <Notice notice={notice} />
      <button
        className="inline-flex h-11 items-center justify-center rounded-md bg-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-blue disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={pending}
      >
        Crear sala
      </button>
    </form>
  );
}

export function EditRoomForm({
  room,
}: {
  room: {
    id: string;
    nombre: string;
    codigo: string;
    ubicacion: string;
    capacidad: number;
    descripcion: string | null;
  };
}) {
  const { formAction, pending, onSubmit, error, notice } = useRoomSubmit(updateRoom);
  return (
    <form id={`editar-${room.id}`} action={formAction} onSubmit={onSubmit} className="flex w-full flex-col gap-4">
      <input type="hidden" name="id" value={room.id} />
      <RoomFields prefix={`editar-${room.id}`} values={room} />
      <Alert error={error} />
      <Notice notice={notice} />
      <button
        className="inline-flex h-11 items-center justify-center rounded-md bg-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-blue disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={pending}
      >
        Guardar cambios
      </button>
    </form>
  );
}

const SCHEDULE_DAYS = [
  { dia: 1, label: "Lunes" },
  { dia: 2, label: "Martes" },
  { dia: 3, label: "Miércoles" },
  { dia: 4, label: "Jueves" },
  { dia: 5, label: "Viernes" },
  { dia: 6, label: "Sábado" },
  { dia: 7, label: "Domingo" },
] as const;

function clockValue(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function DayScheduleForm({
  salaId,
  dia,
  label,
  aperturaMinuto,
  cierreMinuto,
}: {
  salaId: string;
  dia: number;
  label: string;
  aperturaMinuto?: number;
  cierreMinuto?: number;
}) {
  const [localError, setLocalError] = useState("");
  const [state, formAction, pending] = useActionState(saveRoomDaySchedule, null);
  const openId = `horario-${salaId}-${dia}-apertura`;
  const closeId = `horario-${salaId}-${dia}-cierre`;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    const checked = readDaySchedule({
      dia: String(form.get("dia") ?? ""),
      apertura: String(form.get("apertura") ?? ""),
      cierre: String(form.get("cierre") ?? ""),
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
    <form
      id={`horario-${salaId}-${dia}`}
      action={formAction}
      onSubmit={onSubmit}
      aria-label={`Horario del ${label}`}
      className="flex flex-col gap-3 rounded-md border border-line p-3"
    >
      <p className="text-sm font-semibold text-ink">{label}</p>
      <input type="hidden" name="salaId" value={salaId} />
      <input type="hidden" name="dia" value={dia} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink" htmlFor={openId}>
            Apertura
          </label>
          <input
            id={openId}
            className={fieldClass}
            name="apertura"
            type="time"
            defaultValue={aperturaMinuto === undefined ? "" : clockValue(aperturaMinuto)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink" htmlFor={closeId}>
            Cierre
          </label>
          <input
            id={closeId}
            className={fieldClass}
            name="cierre"
            type="time"
            defaultValue={cierreMinuto === undefined ? "" : clockValue(cierreMinuto)}
          />
        </div>
      </div>
      <Alert error={error} />
      <Notice notice={notice} />
      <button
        className="inline-flex h-11 items-center justify-center rounded-md bg-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-blue disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={pending}
      >
        Guardar horario
      </button>
    </form>
  );
}

export function RoomScheduleForm({
  salaId,
  horarios,
}: {
  salaId: string;
  horarios: { dia: number; aperturaMinuto: number; cierreMinuto: number }[];
}) {
  return (
    <section aria-label="Horario" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-navy">Horario</h3>
        <p className="text-xs leading-5 text-muted">
          La apertura y el cierre pertenecen al mismo día. Déjalos vacíos para dejar ese día cerrado.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {SCHEDULE_DAYS.map((day) => {
          const saved = horarios.find((horario) => horario.dia === day.dia);
          return (
            <DayScheduleForm
              key={day.dia}
              salaId={salaId}
              dia={day.dia}
              label={day.label}
              aperturaMinuto={saved?.aperturaMinuto}
              cierreMinuto={saved?.cierreMinuto}
            />
          );
        })}
      </div>
    </section>
  );
}

export function RoomStateForm({ id, estado }: { id: string; estado: string }) {
  const [state, action, pending] = useActionState(setRoomState, null);
  const next = estado === ROOM_ACTIVE ? ROOM_INACTIVE : ROOM_ACTIVE;
  const label = estado === ROOM_ACTIVE ? "Desactivar" : "Activar";
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estado" value={next} />
      <Alert error={state?.error ?? ""} />
      <Notice notice={state?.notice ?? ""} />
      <button
        className="inline-flex h-11 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-navy transition-colors hover:bg-blue-soft disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={pending}
      >
        {label}
      </button>
    </form>
  );
}
