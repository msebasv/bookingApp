import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canCancel,
  MSG_AFTER_CLOSE,
  MSG_BEFORE_OPEN,
  MSG_DURATION,
  MSG_EXACT_MINUTE,
  MSG_GRID,
  MSG_NO_HOURS,
  MSG_SAME_DATE,
  MSG_SCHEDULE,
  MSG_SCHEDULE_DAY,
  MSG_SCHEDULE_PAIR,
  MSG_SCHEDULE_RANGE,
  MSG_WEEKDAY_RANGE,
  MSG_WINDOW,
  occupancyInstants,
  occupanciesOverlap,
  readDaySchedule,
  RESERVATION_MS,
  RESERVATION_WINDOW_MS,
  resolveDuration,
  validateDaySchedule,
  validateReservation,
} from "../../lib/reservations/validation.ts";
import {
  bogotaHourFromPart,
  isRuleError,
  isoWeekdayFromName,
  MSG_WEEKDAY,
  readBogotaClock,
  type RuleError,
  type RuleOk,
} from "../../lib/reservations/time.ts";

function outcomeError(value: RuleError | RuleOk<unknown>) {
  return isRuleError(value) ? value.error : undefined;
}

function outcomeData<T>(value: RuleError | RuleOk<T>) {
  return isRuleError(value) ? undefined : value.data;
}

const OPEN_DAY = { aperturaMinuto: 8 * 60, cierreMinuto: 18 * 60 };

function bogota(year: number, month: number, day: number, hour: number, minute: number, second = 0, millisecond = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour + 5, minute, second, millisecond));
}

describe("días ISO en America/Bogota", () => {
  it("asigna lunes 1 y domingo 7", () => {
    assert.equal(outcomeData(readBogotaClock(bogota(2026, 10, 12, 8, 0)))?.weekday, 1);
    assert.equal(outcomeData(readBogotaClock(bogota(2026, 10, 18, 8, 0)))?.weekday, 7);
  });

  it("lee la fecha de Bogotá cuando el instante UTC ya cambió de día", () => {
    const clock = outcomeData(readBogotaClock(new Date(Date.UTC(2026, 9, 15, 2, 0))));
    assert.equal(clock?.weekday, 3);
    assert.equal(clock?.year, 2026);
    assert.equal(clock?.month, 10);
    assert.equal(clock?.day, 14);
    assert.equal(clock?.hour, 21);
  });

  it("rechaza un nombre de día que no está en el mapa", () => {
    assert.equal(outcomeError(isoWeekdayFromName("Funday")), MSG_WEEKDAY);
    assert.equal(outcomeError(isoWeekdayFromName("monday")), MSG_WEEKDAY);
  });

  it("normaliza la hora 24 de Intl como medianoche", () => {
    const hour = bogotaHourFromPart("24");
    assert.equal(hour, 0);
    assert.equal(hour === null ? -1 : hour * 60, 0);
    assert.equal(bogotaHourFromPart("00"), 0);
    assert.equal(bogotaHourFromPart("25"), null);
  });
});

describe("duración", () => {
  it("asigna 60 minutos cuando la duración se omite y acepta 60 explícitos", () => {
    assert.equal(outcomeData(resolveDuration())?.minutes, 60);
    assert.equal(outcomeData(resolveDuration(60))?.minutes, 60);
  });

  it("rechaza una duración explícita distinta sin devolver una reserva", () => {
    assert.equal(outcomeError(resolveDuration(30)), MSG_DURATION);
    assert.equal(outcomeError(resolveDuration(90)), MSG_DURATION);
    assert.equal(outcomeError(resolveDuration(0)), MSG_DURATION);
    assert.equal("data" in resolveDuration(45), false);
  });
});

describe("ventana de 30 días", () => {
  const now = bogota(2026, 10, 14, 10, 0);

  it("acepta el instante actual y exactamente 30 días después", () => {
    const atLimit = new Date(now.getTime() + RESERVATION_WINDOW_MS);
    assert.equal(outcomeError(validateReservation({ inicio: now, now, schedule: OPEN_DAY })), undefined);
    const later = outcomeData(validateReservation({ inicio: atLimit, now, schedule: OPEN_DAY }));
    assert.equal(later?.fin.getTime(), atLimit.getTime() + RESERVATION_MS);
    assert.ok(later && later.fin.getTime() > now.getTime() + RESERVATION_WINDOW_MS);
  });

  it("rechaza un inicio anterior o posterior a la ventana", () => {
    assert.equal(
      outcomeError(validateReservation({ inicio: new Date(now.getTime() - 1), now, schedule: OPEN_DAY })),
      MSG_WINDOW,
    );
    assert.equal(
      outcomeError(
        validateReservation({
          inicio: new Date(now.getTime() + RESERVATION_WINDOW_MS + 1),
          now,
          schedule: OPEN_DAY,
        }),
      ),
      MSG_WINDOW,
    );
  });
});

describe("rejilla y días permitidos", () => {
  const now = bogota(2026, 10, 12, 7, 0);

  it("acepta 08:00, 08:30 y 09:00 de lunes a viernes", () => {
    for (const minute of [0, 30]) {
      const result = validateReservation({
        inicio: bogota(2026, 10, 14, 8, minute),
        now,
        schedule: OPEN_DAY,
      });
      assert.equal(outcomeError(result), undefined);
    }
    assert.equal(
      outcomeError(validateReservation({ inicio: bogota(2026, 10, 14, 9, 0), now, schedule: OPEN_DAY })),
      undefined,
    );
  });

  it("rechaza las 08:15 y un inicio con segundos o milisegundos", () => {
    assert.equal(
      outcomeError(validateReservation({ inicio: bogota(2026, 10, 14, 8, 15), now, schedule: OPEN_DAY })),
      MSG_GRID,
    );
    assert.equal(
      outcomeError(validateReservation({ inicio: bogota(2026, 10, 14, 8, 0, 1), now, schedule: OPEN_DAY })),
      MSG_EXACT_MINUTE,
    );
    assert.equal(
      outcomeError(validateReservation({ inicio: bogota(2026, 10, 14, 8, 0, 0, 1), now, schedule: OPEN_DAY })),
      MSG_EXACT_MINUTE,
    );
  });

  it("rechaza sábado y domingo aunque tengan horario", () => {
    const weekend = { aperturaMinuto: 8 * 60, cierreMinuto: 12 * 60 };
    assert.equal(
      outcomeError(validateReservation({ inicio: bogota(2026, 10, 17, 8, 0), now, schedule: weekend })),
      MSG_WEEKDAY_RANGE,
    );
    assert.equal(
      outcomeError(validateReservation({ inicio: bogota(2026, 10, 18, 8, 0), now, schedule: weekend })),
      MSG_WEEKDAY_RANGE,
    );
  });
});

describe("horario del día", () => {
  const now = bogota(2026, 10, 12, 7, 0);

  it("acepta el inicio igual a la apertura y el fin igual al cierre", () => {
    const opening = validateReservation({
      inicio: bogota(2026, 10, 14, 8, 0),
      now,
      schedule: { aperturaMinuto: 8 * 60, cierreMinuto: 18 * 60 },
    });
    assert.equal(outcomeError(opening), undefined);

    const closing = validateReservation({
      inicio: bogota(2026, 10, 14, 8, 0),
      now,
      schedule: { aperturaMinuto: 8 * 60, cierreMinuto: 9 * 60 },
    });
    assert.equal(outcomeError(closing), undefined);
    assert.equal(outcomeData(closing)?.fin.getTime(), bogota(2026, 10, 14, 9, 0).getTime());
  });

  it("rechaza un inicio anterior a la apertura, un fin posterior al cierre y un día sin horario", () => {
    assert.equal(
      outcomeError(validateReservation({
        inicio: bogota(2026, 10, 14, 7, 30),
        now,
        schedule: OPEN_DAY,
      })),
      MSG_BEFORE_OPEN,
    );
    assert.equal(
      outcomeError(validateReservation({
        inicio: bogota(2026, 10, 14, 8, 0),
        now,
        schedule: { aperturaMinuto: 8 * 60, cierreMinuto: 8 * 60 + 30 },
      })),
      MSG_AFTER_CLOSE,
    );
    assert.equal(
      outcomeError(validateReservation({ inicio: bogota(2026, 10, 14, 8, 0), now, schedule: null })),
      MSG_NO_HOURS,
    );
  });

  it("rechaza un cierre igual o anterior a la apertura y minutos fuera de 0 a 1439", () => {
    assert.equal(outcomeError(validateDaySchedule(8 * 60, 8 * 60)), MSG_SCHEDULE);
    assert.equal(outcomeError(validateDaySchedule(10 * 60, 8 * 60)), MSG_SCHEDULE);
    assert.equal(outcomeError(validateDaySchedule(-1, 60)), MSG_SCHEDULE_RANGE);
    assert.equal(outcomeError(validateDaySchedule(0, 1440)), MSG_SCHEDULE_RANGE);
    assert.equal(outcomeError(validateDaySchedule(8.5, 18 * 60)), MSG_SCHEDULE_RANGE);
  });

  it("lee un horario de un día y rechaza un par incompleto o que cruza la medianoche", () => {
    const saved = outcomeData(readDaySchedule({ dia: "1", apertura: "08:00", cierre: "18:00" }));
    assert.equal(saved?.dia, 1);
    assert.equal(saved?.schedule?.aperturaMinuto, 8 * 60);
    assert.equal(saved?.schedule?.cierreMinuto, 18 * 60);
    assert.equal(outcomeData(readDaySchedule({ dia: "7", apertura: "", cierre: "" }))?.schedule, null);
    assert.equal(outcomeError(readDaySchedule({ dia: "1", apertura: "08:00", cierre: "" })), MSG_SCHEDULE_PAIR);
    assert.equal(outcomeError(readDaySchedule({ dia: "1", apertura: "08:00", cierre: "08:00" })), MSG_SCHEDULE);
    assert.equal(outcomeError(readDaySchedule({ dia: "1", apertura: "22:00", cierre: "02:00" })), MSG_SCHEDULE);
    assert.equal(outcomeError(readDaySchedule({ dia: "0", apertura: "08:00", cierre: "09:00" })), MSG_SCHEDULE_DAY);
    assert.equal(outcomeError(readDaySchedule({ dia: "1", apertura: "24:00", cierre: "18:00" })), MSG_SCHEDULE_RANGE);
  });

  it("rechaza una reserva que cruza la medianoche de Bogotá", () => {
    const late = { aperturaMinuto: 8 * 60, cierreMinuto: 23 * 60 + 59 };
    assert.equal(
      outcomeError(validateReservation({ inicio: bogota(2026, 10, 12, 23, 0), now, schedule: late })),
      MSG_SAME_DATE,
    );
    assert.equal(
      outcomeError(validateReservation({ inicio: bogota(2026, 10, 15, 23, 30), now, schedule: late })),
      MSG_SAME_DATE,
    );
    assert.equal(
      outcomeError(validateReservation({ inicio: bogota(2026, 10, 16, 23, 0), now, schedule: late })),
      MSG_SAME_DATE,
    );
  });
});

describe("ocupaciones y cancelación", () => {
  const inicio = bogota(2026, 10, 14, 8, 0);

  it("ocupa el inicio y 30 minutos después, no el fin", () => {
    const [first, second] = occupancyInstants(inicio);
    assert.equal(first.getTime(), inicio.getTime());
    assert.equal(second.getTime(), bogota(2026, 10, 14, 8, 30).getTime());
    assert.equal(
      [first, second].some((instant) => instant.getTime() === bogota(2026, 10, 14, 9, 0).getTime()),
      false,
    );
  });

  it("trata los intervalos como adyacentes cuando uno empieza al terminar el otro", () => {
    assert.equal(occupanciesOverlap(inicio, inicio), true);
    assert.equal(occupanciesOverlap(inicio, bogota(2026, 10, 14, 8, 30)), true);
    assert.equal(occupanciesOverlap(inicio, bogota(2026, 10, 14, 9, 0)), false);
  });

  it("permite cancelar solo con un reloj estrictamente anterior al inicio", () => {
    assert.equal(outcomeData(canCancel(inicio, new Date(inicio.getTime() - 1)))?.allowed, true);
    assert.equal(outcomeData(canCancel(inicio, inicio))?.allowed, false);
    assert.equal(outcomeData(canCancel(inicio, new Date(inicio.getTime() + 1)))?.allowed, false);
  });

  it("rechaza fechas inválidas sin sustituirlas", () => {
    const invalid = new Date(Number.NaN);
    assert.equal(
      outcomeError(validateReservation({ inicio: invalid, now: inicio, schedule: OPEN_DAY })),
      "La fecha no es válida.",
    );
    assert.equal(outcomeError(canCancel(invalid, inicio)), "La fecha no es válida.");
    assert.equal("data" in validateReservation({ inicio: invalid, now: inicio, schedule: OPEN_DAY }), false);
  });
});
