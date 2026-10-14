import { RESERVATION_CANCELLED, RESERVATION_CONFIRMED, RESERVATION_MINUTES } from "./validation.ts";

export const FILTER_UPCOMING = "proximas";
export const FILTER_PAST = "pasadas";
export const FILTER_CANCELLED = "canceladas";

export const MSG_NO_COMPATIBLE_START = "No hay un inicio de 60 minutos dentro de ese horario.";
export const MSG_PICK_DATE = "Elige una fecha para ver las horas disponibles.";
export const MSG_WEEKEND_NOTE = "Sábado y domingo no se pueden reservar.";
export const MSG_DAY_CLOSED = "Sin horario";

const HALF_HOUR = 30;

export type ReservationFilter = typeof FILTER_UPCOMING | typeof FILTER_PAST | typeof FILTER_CANCELLED;

export type AgendaBand = {
  startMinute: number;
  state: "libre" | "ocupada";
};

export type AgendaView =
  | { kind: "weekend" }
  | { kind: "closed" }
  | { kind: "bands"; bands: AgendaBand[] };

export type StartOffer = {
  starts: number[];
  reason: "date" | "weekend" | "closed" | "short" | "ok";
};

type DaySchedule = { aperturaMinuto: number; cierreMinuto: number };

export function minuteLabel(minute: number) {
  const hour = Math.floor(minute / 60);
  const rest = minute % 60;
  return `${String(hour).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function reservationListFilter(value: string | undefined): ReservationFilter {
  if (value === FILTER_PAST || value === FILTER_CANCELLED) {
    return value;
  }
  return FILTER_UPCOMING;
}

export function reservationWhere(filter: ReservationFilter, now: Date) {
  if (filter === FILTER_CANCELLED) {
    return { estado: RESERVATION_CANCELLED };
  }
  if (filter === FILTER_PAST) {
    return { estado: RESERVATION_CONFIRMED, fin: { lte: now } };
  }
  return { estado: RESERVATION_CONFIRMED, fin: { gt: now } };
}

export function reservationMatchesFilter(estado: string, fin: Date, now: Date, filter: ReservationFilter) {
  if (filter === FILTER_CANCELLED) {
    return estado === RESERVATION_CANCELLED;
  }
  if (estado !== RESERVATION_CONFIRMED) {
    return false;
  }
  if (filter === FILTER_PAST) {
    return fin.getTime() <= now.getTime();
  }
  return fin.getTime() > now.getTime();
}

function firstBandMinute(opening: number) {
  const remainder = opening % HALF_HOUR;
  return remainder === 0 ? opening : opening + (HALF_HOUR - remainder);
}

export function offeredStartMinutes(schedule: DaySchedule) {
  const starts: number[] = [];
  for (let minute = firstBandMinute(schedule.aperturaMinuto); minute + RESERVATION_MINUTES <= schedule.cierreMinuto; minute += HALF_HOUR) {
    starts.push(minute);
  }
  return starts;
}

export function startOffer(weekday: number | null, schedule: DaySchedule | null): StartOffer {
  if (weekday === null) {
    return { starts: [], reason: "date" };
  }
  if (weekday === 6 || weekday === 7) {
    return { starts: [], reason: "weekend" };
  }
  if (!schedule) {
    return { starts: [], reason: "closed" };
  }
  const starts = offeredStartMinutes(schedule);
  if (starts.length === 0) {
    return { starts: [], reason: "short" };
  }
  return { starts, reason: "ok" };
}

export function agendaForDay(weekday: number, schedule: DaySchedule | null, occupiedMinutes: readonly number[]): AgendaView {
  if (weekday === 6 || weekday === 7) {
    return { kind: "weekend" };
  }
  if (!schedule) {
    return { kind: "closed" };
  }
  const bands: AgendaBand[] = [];
  for (let minute = firstBandMinute(schedule.aperturaMinuto); minute + HALF_HOUR <= schedule.cierreMinuto; minute += HALF_HOUR) {
    const occupied = occupiedMinutes.some((value) => value >= minute && value < minute + HALF_HOUR);
    bands.push({ startMinute: minute, state: occupied ? "ocupada" : "libre" });
  }
  return { kind: "bands", bands };
}
