import { BOGOTA_TIME_ZONE, SESSION_MS } from "@/lib/auth/constants";

export function sessionExpiry(createdAt: Date) {
  return new Date(createdAt.getTime() + SESSION_MS);
}

export function bogotaHour(date: Date) {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: BOGOTA_TIME_ZONE,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return Number(hour);
}
