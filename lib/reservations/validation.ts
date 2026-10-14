import {
  isRuleError,
  MSG_INSTANT,
  readBogotaClock,
  type BogotaClock,
  type RuleError,
  type RuleOk,
} from "./time.ts";

export { MSG_INSTANT };

export const RESERVATION_MINUTES = 60;
export const HALF_HOUR_MINUTES = 30;
export const MINUTE_MS = 60 * 1000;
export const RESERVATION_MS = RESERVATION_MINUTES * MINUTE_MS;
export const HALF_HOUR_MS = HALF_HOUR_MINUTES * MINUTE_MS;
export const RESERVATION_WINDOW_DAYS = 30;
export const RESERVATION_WINDOW_MS = RESERVATION_WINDOW_DAYS * 24 * 60 * MINUTE_MS;
export const MINUTE_OF_DAY_MAX = 24 * 60 - 1;

export const MSG_DURATION = "La duración debe ser de 60 minutos.";
export const MSG_WINDOW = "El inicio debe estar entre este instante y 30 días después.";
export const MSG_GRID = "El inicio debe caer en un minuto 00 o 30.";
export const MSG_EXACT_MINUTE = "El inicio debe tener segundos y milisegundos en cero.";
export const MSG_SAME_DATE = "La reserva debe empezar y terminar el mismo día en Bogotá.";
export const MSG_WEEKDAY_RANGE = "Solo se puede reservar de lunes a viernes.";
export const MSG_NO_HOURS = "Ese día no tiene horario.";
export const MSG_BEFORE_OPEN = "El inicio es anterior a la apertura.";
export const MSG_AFTER_CLOSE = "El fin supera el cierre.";
export const MSG_SCHEDULE = "El cierre debe ser posterior a la apertura, dentro del mismo día.";
export const MSG_SCHEDULE_RANGE = "La apertura y el cierre deben ser minutos enteros entre 0 y 1439.";
export const MSG_SCHEDULE_PAIR = "Indica la apertura y el cierre, o deja ambos vacíos para cerrar el día.";
export const MSG_SCHEDULE_DAY = "El día no es válido.";
export const MSG_SCHEDULE_SAVED = "Horario guardado.";
export const MSG_SCHEDULE_CLEARED = "El día quedó sin horario.";
export const MSG_SCHEDULE_LOGIN = "Debes iniciar sesión.";
export const MSG_SCHEDULE_FORBIDDEN = "No autorizado.";
export const MSG_SCHEDULE_ROOM = "No se encontró la sala.";
export const RESERVATION_CONFIRMED = "CONFIRMADA";
export const RESERVATION_CANCELLED = "CANCELADA";
export const MSG_RESERVATION_CREATED = "Reserva confirmada.";
export const MSG_RESERVATION_CANCELLED = "Reserva cancelada.";
export const MSG_RESERVATION_FORBIDDEN = "No autorizado.";
export const MSG_NO_EDIT = "No se puede editar una reserva.";
export const MSG_OVERLAP = "Ese horario ya está ocupado.";
export const MSG_RESERVATION_BUSY = "No se pudo completar la reserva. Inténtalo de nuevo.";
export const MSG_INACTIVE_ROOM = "La sala no está activa.";
export const MSG_CANCEL_TOO_LATE = "Solo se puede cancelar antes del inicio.";
export const MSG_RESERVATION_MISSING = "No se encontró la reserva.";
export const MSG_ALREADY_CANCELLED = "La reserva ya está cancelada.";
export const MSG_RESERVATIONS_EMPTY = "No hay reservas.";
export const MSG_ROOM_REQUIRED = "Elige una sala.";

export type DaySchedule = {
  aperturaMinuto: number;
  cierreMinuto: number;
};

export type ReservationDraft = {
  inicio: Date;
  fin: Date;
  occupancy: [Date, Date];
};

function validInstant(value: Date): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function resolveDuration(duration?: number): RuleOk<{ minutes: typeof RESERVATION_MINUTES }> | RuleError {
  if (duration === undefined) {
    return { data: { minutes: RESERVATION_MINUTES } };
  }
  if (duration !== RESERVATION_MINUTES) {
    return { error: MSG_DURATION };
  }
  return { data: { minutes: RESERVATION_MINUTES } };
}

export function startWithinWindow(inicio: Date, now: Date): RuleOk<{ inicio: Date }> | RuleError {
  if (!validInstant(inicio) || !validInstant(now)) {
    return { error: MSG_INSTANT };
  }
  const start = inicio.getTime();
  const current = now.getTime();
  if (start < current || start > current + RESERVATION_WINDOW_MS) {
    return { error: MSG_WINDOW };
  }
  return { data: { inicio } };
}

export function validateDaySchedule(
  aperturaMinuto: number,
  cierreMinuto: number,
): RuleOk<DaySchedule> | RuleError {
  const minutes = [aperturaMinuto, cierreMinuto];
  if (minutes.some((minute) => !Number.isInteger(minute) || minute < 0 || minute > MINUTE_OF_DAY_MAX)) {
    return { error: MSG_SCHEDULE_RANGE };
  }
  if (cierreMinuto <= aperturaMinuto) {
    return { error: MSG_SCHEDULE };
  }
  return { data: { aperturaMinuto, cierreMinuto } };
}

export function parseBogotaDateTime(fecha: string, hora: string): Date | null {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha.trim());
  const time = /^(\d{2}):(\d{2})$/.exec(hora.trim());
  if (!date || !time) {
    return null;
  }
  const year = Number(date[1]);
  const month = Number(date[2]);
  const day = Number(date[3]);
  const hour = Number(time[1]);
  const minute = Number(time[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    return null;
  }
  const instant = new Date(Date.UTC(year, month - 1, day, hour + 5, minute, 0, 0));
  const clock = readBogotaClock(instant);
  if (isRuleError(clock)) {
    return null;
  }
  if (
    clock.data.year !== year ||
    clock.data.month !== month ||
    clock.data.day !== day ||
    clock.data.hour !== hour ||
    clock.data.minute !== minute
  ) {
    return null;
  }
  return instant;
}

export function parseClockMinute(value: string): number | null | "invalid" {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (!match) {
    return "invalid";
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = match[3] === undefined ? 0 : Number(match[3]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || !Number.isInteger(second)) {
    return "invalid";
  }
  if (hour > 23 || minute > 59 || second !== 0) {
    return "invalid";
  }
  return hour * 60 + minute;
}

export function readDaySchedule(input: {
  dia: string;
  apertura: string;
  cierre: string;
}): RuleError | RuleOk<{ dia: number; schedule: DaySchedule | null }> {
  const dia = Number(input.dia);
  if (!Number.isInteger(dia) || dia < 1 || dia > 7) {
    return { error: MSG_SCHEDULE_DAY };
  }
  const apertura = parseClockMinute(input.apertura);
  const cierre = parseClockMinute(input.cierre);
  if (apertura === "invalid" || cierre === "invalid") {
    return { error: MSG_SCHEDULE_RANGE };
  }
  if ((apertura === null) !== (cierre === null)) {
    return { error: MSG_SCHEDULE_PAIR };
  }
  if (apertura === null || cierre === null) {
    return { data: { dia, schedule: null } };
  }
  const schedule = validateDaySchedule(apertura, cierre);
  if (isRuleError(schedule)) {
    return schedule;
  }
  return { data: { dia, schedule: schedule.data } };
}

export function occupancyInstants(inicio: Date): [Date, Date] {
  return [new Date(inicio.getTime()), new Date(inicio.getTime() + HALF_HOUR_MS)];
}

export function occupanciesOverlap(left: Date, right: Date) {
  const rightInstants = new Set(occupancyInstants(right).map((instant) => instant.getTime()));
  return occupancyInstants(left).some((instant) => rightInstants.has(instant.getTime()));
}

export function canCancel(inicio: Date, now: Date): RuleOk<{ allowed: boolean }> | RuleError {
  if (!validInstant(inicio) || !validInstant(now)) {
    return { error: MSG_INSTANT };
  }
  return { data: { allowed: now.getTime() < inicio.getTime() } };
}

function onHalfHourGrid(inicio: Date, clock: BogotaClock): RuleError | null {
  if (inicio.getTime() % 1000 !== 0 || clock.second !== 0) {
    return { error: MSG_EXACT_MINUTE };
  }
  if (clock.minute !== 0 && clock.minute !== HALF_HOUR_MINUTES) {
    return { error: MSG_GRID };
  }
  return null;
}

function sameBogotaDate(left: BogotaClock, right: BogotaClock) {
  return left.year === right.year && left.month === right.month && left.day === right.day;
}

function reservableWeekday(clock: BogotaClock) {
  return clock.weekday >= 1 && clock.weekday <= 5;
}

export function validateReservation(input: {
  inicio: Date;
  now: Date;
  duration?: number;
  schedule: DaySchedule | null;
}): RuleOk<ReservationDraft> | RuleError {
  if (!validInstant(input.inicio)) {
    return { error: MSG_INSTANT };
  }

  const duration = resolveDuration(input.duration);
  if (isRuleError(duration)) {
    return duration;
  }

  const fin = new Date(input.inicio.getTime() + duration.data.minutes * MINUTE_MS);
  const startClock = readBogotaClock(input.inicio);
  if (isRuleError(startClock)) {
    return startClock;
  }
  const endClock = readBogotaClock(fin);
  if (isRuleError(endClock)) {
    return endClock;
  }

  const window = startWithinWindow(input.inicio, input.now);
  if (isRuleError(window)) {
    return window;
  }

  const grid = onHalfHourGrid(input.inicio, startClock.data);
  if (grid) {
    return grid;
  }

  if (!sameBogotaDate(startClock.data, endClock.data)) {
    return { error: MSG_SAME_DATE };
  }
  if (!reservableWeekday(startClock.data) || !reservableWeekday(endClock.data)) {
    return { error: MSG_WEEKDAY_RANGE };
  }
  if (input.schedule === null) {
    return { error: MSG_NO_HOURS };
  }

  const schedule = validateDaySchedule(input.schedule.aperturaMinuto, input.schedule.cierreMinuto);
  if (isRuleError(schedule)) {
    return schedule;
  }
  if (startClock.data.minuteOfDay < schedule.data.aperturaMinuto) {
    return { error: MSG_BEFORE_OPEN };
  }
  if (endClock.data.minuteOfDay > schedule.data.cierreMinuto) {
    return { error: MSG_AFTER_CLOSE };
  }

  return {
    data: {
      inicio: input.inicio,
      fin,
      occupancy: occupancyInstants(input.inicio),
    },
  };
}
