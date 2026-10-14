import { BOGOTA_TIME_ZONE } from "../auth/constants.ts";

export const ISO_WEEKDAYS = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
} as const;

export const MSG_INSTANT = "La fecha no es válida.";
export const MSG_WEEKDAY = "No se reconoce el día de la semana.";
export const MSG_CLOCK = "No se pudo leer la hora en Bogotá.";

export type RuleError = { error: string };
export type RuleOk<T> = { data: T };

export type BogotaClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
  minuteOfDay: number;
};

const bogotaFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BOGOTA_TIME_ZONE,
  weekday: "long",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function isRuleError<T>(value: RuleError | RuleOk<T>): value is RuleError {
  return "error" in value;
}

export function bogotaHourFromPart(hourText: string): number | null {
  const hour = hourText === "24" ? 0 : Number(hourText);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return null;
  }
  return hour;
}

export function isoWeekdayFromName(name: string): RuleOk<{ weekday: number }> | RuleError {
  if (!Object.hasOwn(ISO_WEEKDAYS, name)) {
    return { error: MSG_WEEKDAY };
  }
  return { data: { weekday: ISO_WEEKDAYS[name as keyof typeof ISO_WEEKDAYS] } };
}

function partValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value;
}

export function readBogotaClock(instant: Date): RuleOk<BogotaClock> | RuleError {
  if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) {
    return { error: MSG_INSTANT };
  }

  const parts = bogotaFormatter.formatToParts(instant);
  const weekdayName = partValue(parts, "weekday");
  const year = partValue(parts, "year");
  const month = partValue(parts, "month");
  const day = partValue(parts, "day");
  const hourText = partValue(parts, "hour");
  const minuteText = partValue(parts, "minute");
  const secondText = partValue(parts, "second");
  if (!weekdayName || !year || !month || !day || !hourText || !minuteText || !secondText) {
    return { error: MSG_CLOCK };
  }

  const weekday = isoWeekdayFromName(weekdayName);
  if (isRuleError(weekday)) {
    return weekday;
  }

  const hour = bogotaHourFromPart(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (hour === null || !Number.isInteger(minute) || !Number.isInteger(second)) {
    return { error: MSG_CLOCK };
  }

  return {
    data: {
      year: Number(year),
      month: Number(month),
      day: Number(day),
      hour,
      minute,
      second,
      weekday: weekday.data.weekday,
      minuteOfDay: hour * 60 + minute,
    },
  };
}
