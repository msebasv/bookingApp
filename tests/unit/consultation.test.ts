import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  agendaForDay,
  FILTER_CANCELLED,
  FILTER_PAST,
  FILTER_UPCOMING,
  offeredStartMinutes,
  reservationListFilter,
  reservationMatchesFilter,
  reservationWhere,
  startOffer,
} from "../../lib/reservations/consultation.ts";
import { RESERVATION_CANCELLED, RESERVATION_CONFIRMED } from "../../lib/reservations/validation.ts";

const OPEN_DAY = { aperturaMinuto: 8 * 60, cierreMinuto: 18 * 60 };

describe("inicios ofrecidos", () => {
  it("ofrece inicios de la grilla que caben antes del cierre", () => {
    const starts = offeredStartMinutes(OPEN_DAY);
    assert.equal(starts[0], 8 * 60);
    assert.equal(starts.includes(8 * 60 + 30), true);
    assert.equal(starts.at(-1), 17 * 60);
    assert.equal(starts.includes(17 * 60 + 30), false);
    assert.equal(starts.every((minute) => minute % 30 === 0), true);
  });

  it("empieza en la apertura cuando coincide con la grilla", () => {
    assert.equal(offeredStartMinutes({ aperturaMinuto: 8 * 60, cierreMinuto: 9 * 60 })[0], 8 * 60);
  });

  it("no ofrece inicios en sábado, domingo, un día sin horario o un horario demasiado corto", () => {
    assert.deepEqual(startOffer(6, OPEN_DAY), { starts: [], reason: "weekend" });
    assert.deepEqual(startOffer(7, OPEN_DAY), { starts: [], reason: "weekend" });
    assert.deepEqual(startOffer(1, null), { starts: [], reason: "closed" });
    assert.equal(startOffer(3, { aperturaMinuto: 8 * 60, cierreMinuto: 8 * 60 + 30 }).starts.length, 0);
    assert.equal(startOffer(null, OPEN_DAY).reason, "date");
  });
});

describe("agenda de franjas", () => {
  it("marca libre y ocupada sin datos de la reserva", () => {
    const view = agendaForDay(1, OPEN_DAY, [8 * 60, 8 * 60 + 30]);
    assert.equal(view.kind, "bands");
    if (view.kind !== "bands") {
      return;
    }
    assert.equal(view.bands[0]?.state, "ocupada");
    assert.equal(view.bands[1]?.state, "ocupada");
    assert.equal(view.bands[2]?.state, "libre");
    assert.deepEqual(Object.keys(view.bands[0] ?? {}).sort(), ["startMinute", "state"]);
  });

  it("no arma franjas en fin de semana ni en un día sin horario", () => {
    assert.deepEqual(agendaForDay(6, OPEN_DAY, [8 * 60]), { kind: "weekend" });
    assert.deepEqual(agendaForDay(4, null, [8 * 60]), { kind: "closed" });
  });
});

describe("filtro de reservas", () => {
  const now = new Date("2026-10-14T15:00:00.000Z");
  const upcomingEnd = new Date(now.getTime() + 60_000);
  const pastEnd = new Date(now.getTime() - 60_000);

  it("trata un filtro ausente o desconocido como próximas", () => {
    assert.equal(reservationListFilter(undefined), FILTER_UPCOMING);
    assert.equal(reservationListFilter("todas"), FILTER_UPCOMING);
    assert.equal(reservationListFilter(FILTER_PAST), FILTER_PAST);
    assert.equal(reservationListFilter(FILTER_CANCELLED), FILTER_CANCELLED);
  });

  it("clasifica confirmadas vigentes, confirmadas terminadas y canceladas", () => {
    assert.equal(reservationMatchesFilter(RESERVATION_CONFIRMED, upcomingEnd, now, FILTER_UPCOMING), true);
    assert.equal(reservationMatchesFilter(RESERVATION_CONFIRMED, pastEnd, now, FILTER_UPCOMING), false);
    assert.equal(reservationMatchesFilter(RESERVATION_CONFIRMED, pastEnd, now, FILTER_PAST), true);
    assert.equal(reservationMatchesFilter(RESERVATION_CONFIRMED, upcomingEnd, now, FILTER_PAST), false);
    assert.equal(reservationMatchesFilter(RESERVATION_CANCELLED, upcomingEnd, now, FILTER_UPCOMING), false);
    assert.equal(reservationMatchesFilter(RESERVATION_CANCELLED, pastEnd, now, FILTER_PAST), false);
    assert.equal(reservationMatchesFilter(RESERVATION_CANCELLED, pastEnd, now, FILTER_CANCELLED), true);
  });

  it("deja una reserva en curso dentro de próximas", () => {
    const inProgressEnd = new Date(now.getTime() + 30 * 60_000);
    assert.equal(reservationMatchesFilter(RESERVATION_CONFIRMED, inProgressEnd, now, FILTER_UPCOMING), true);
    const upcoming = reservationWhere(FILTER_UPCOMING, now);
    assert.equal(upcoming.fin?.gt?.getTime(), now.getTime());
    assert.equal(reservationWhere(FILTER_PAST, now).estado, RESERVATION_CONFIRMED);
    assert.equal(reservationWhere(FILTER_CANCELLED, now).estado, RESERVATION_CANCELLED);
  });
});
