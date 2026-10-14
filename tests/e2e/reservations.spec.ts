import { execFileSync } from "node:child_process";
import { expect, test, type BrowserContext, type Page, type Request } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.BOOKINGAPP_E2E_DATABASE_URL ?? "file:./e2e.db";
process.env.DATABASE_URL = databaseUrl;

const prisma = new PrismaClient();
const PASSWORD = "secreto12";
const ADMIN_EMAIL = "admin@bookingapp.test";
const ADMIN_PASSWORD = "adminpass1";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  execFileSync(process.execPath, ["scripts/init-admin.js"], {
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
    },
  });
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@bookingapp.test`;
}

function uniqueCode(prefix: string) {
  return `${prefix}${Math.random().toString(16).slice(2, 8)}`.slice(0, 20);
}

async function register(page: Page, email: string) {
  await page.goto("/registro");
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByText("Cuenta creada. Ya puedes iniciar sesión.")).toBeVisible();
}

async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/ingreso");
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByText(`Sesión activa para ${email}`)).toBeVisible();
}

function roomArticle(page: Page, codigo: string) {
  return page.getByRole("article", { name: codigo });
}

function dayForm(page: Page, codigo: string, day: string) {
  return roomArticle(page, codigo).getByRole("form", { name: `Horario del ${day}` });
}

async function createRoom(page: Page, codigo: string) {
  const form = page.locator("#crear-sala");
  await form.getByLabel("Nombre", { exact: true }).fill(`Sala ${codigo}`);
  await form.getByLabel("Código", { exact: true }).fill(codigo);
  await form.getByLabel("Ubicación", { exact: true }).fill("Bloque horario");
  await form.getByLabel("Capacidad", { exact: true }).fill("8");
  await form.getByLabel("Descripción", { exact: true }).fill("");
  await form.getByRole("button", { name: "Crear sala" }).click();
  await expect(roomArticle(page, codigo)).toBeVisible();
}

async function saveDay(page: Page, codigo: string, day: string, apertura: string, cierre: string) {
  const form = dayForm(page, codigo, day);
  await form.locator("input[name='apertura']").fill(apertura);
  await form.locator("input[name='cierre']").fill(cierre);
  await form.getByRole("button", { name: "Guardar horario" }).click();
}

function claimAdministrator(body: Buffer) {
  const text = body.toString("latin1");
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const boundary = text.match(/------WebKitFormBoundary[^\r\n-]*/)?.[0];
  if (!boundary) {
    return null;
  }
  const closing = `${newline}${boundary}--`;
  const at = text.lastIndexOf(closing);
  if (at < 0) {
    return null;
  }
  const part = `${newline}${boundary}${newline}Content-Disposition: form-data; name="_1_rol"${newline}${newline}ADMINISTRADOR`;
  return Buffer.from(`${text.slice(0, at)}${part}${text.slice(at)}`, "latin1");
}

function replaceFormField(body: Buffer, field: string, value: string) {
  const text = body.toString("latin1");
  const marker = `name="_1_${field}"`;
  const start = text.indexOf(marker);
  if (start < 0) {
    return null;
  }
  const valueStart = text.indexOf("\r\n\r\n", start);
  const valueEnd = valueStart < 0 ? -1 : text.indexOf("\r\n", valueStart + 4);
  if (valueStart < 0 || valueEnd < 0) {
    return null;
  }
  return Buffer.from(`${text.slice(0, valueStart + 4)}${value}${text.slice(valueEnd)}`, "latin1");
}

async function replayAction(context: BrowserContext, source: Request, body?: Buffer) {
  const incoming = source.headers();
  const headers: Record<string, string> = {};
  for (const name of ["next-action", "content-type", "accept", "next-url", "next-router-state-tree"]) {
    if (incoming[name]) {
      headers[name] = incoming[name];
    }
  }
  const cookies = await context.cookies();
  if (cookies.length > 0) {
    headers.cookie = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  }
  return context.request.post(source.url(), {
    headers,
    data: body ?? source.postDataBuffer() ?? undefined,
  });
}

async function storedDay(codigo: string, dia: number) {
  const sala = await prisma.sala.findUniqueOrThrow({ where: { codigo } });
  return prisma.horarioSala.findUnique({ where: { salaId_dia: { salaId: sala.id, dia } } });
}

const DAY_LABEL = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function bogotaParts(instant: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekdayName = value("weekday");
  const weekday = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].indexOf(weekdayName) + 1;
  return {
    weekday,
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
  };
}

function bogotaInstant(year: number, month: number, day: number, hour: number, minute: number) {
  return new Date(Date.UTC(year, month - 1, day, hour + 5, minute, 0, 0));
}

function fechaOf(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function upcomingMorning(now = new Date()) {
  for (let offset = 0; offset <= 14; offset += 1) {
    const parts = bogotaParts(new Date(now.getTime() + offset * 24 * 60 * 60 * 1000));
    if (parts.weekday < 1 || parts.weekday > 5) {
      continue;
    }
    const start = bogotaInstant(parts.year, parts.month, parts.day, 8, 0);
    if (start.getTime() < now.getTime() || start.getTime() > now.getTime() + 30 * 24 * 60 * 60 * 1000) {
      continue;
    }
    return {
      fecha: fechaOf(parts.year, parts.month, parts.day),
      label: DAY_LABEL[parts.weekday],
      start,
    };
  }
  throw new Error("No hay un día laborable futuro dentro de la ventana.");
}

function upcomingWeekday(weekday: number, now = new Date()) {
  for (let offset = 0; offset <= 14; offset += 1) {
    const parts = bogotaParts(new Date(now.getTime() + offset * 24 * 60 * 60 * 1000));
    if (parts.weekday !== weekday) {
      continue;
    }
    const start = bogotaInstant(parts.year, parts.month, parts.day, 8, 0);
    if (start.getTime() < now.getTime()) {
      continue;
    }
    return { fecha: fechaOf(parts.year, parts.month, parts.day), label: DAY_LABEL[weekday], start };
  }
  throw new Error("No hay un fin de semana futuro.");
}

async function reservationsFor(codigo: string) {
  const sala = await prisma.sala.findUniqueOrThrow({ where: { codigo } });
  return prisma.reserva.findMany({
    where: { salaId: sala.id },
    include: { ocupaciones: true },
    orderBy: { creadoEn: "asc" },
  });
}

async function openDay(page: Page, codigo: string, label: string) {
  await saveDay(page, codigo, label, "08:00", "18:00");
  await expect(dayForm(page, codigo, label).getByText("Horario guardado.")).toBeVisible();
}

async function book(page: Page, codigo: string, fecha: string, hora: string) {
  const form = page.locator("#crear-reserva");
  await form.locator("select[name='salaId']").selectOption({ label: codigo });
  await form.locator("input[name='fecha']").fill(fecha);
  await form.locator("input[name='hora']").fill(hora);
  await form.locator("input[name='duracion']").fill("");
  await form.getByRole("button", { name: "Confirmar reserva" }).click();
}

async function bookAndConfirm(page: Page, codigo: string, fecha: string, hora: string) {
  const pending = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().includes("/reservas"),
  );
  await book(page, codigo, fecha, hora);
  await pending;
  await expect(page.locator("#crear-reserva").getByText("Reserva confirmada.")).toBeVisible();
}

test("un par inválido no cambia el horario guardado y vaciar el día lo borra", async ({ page }) => {
  const codigo = uniqueCode("H");
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/salas");
  await createRoom(page, codigo);
  await expect(roomArticle(page, codigo).getByRole("region", { name: "Horario" })).toBeVisible();

  const requestPromise = page.waitForRequest(
    (request) => request.method() === "POST" && request.url().includes("/salas"),
  );
  await saveDay(page, codigo, "Lunes", "08:00", "18:00");
  const source = await requestPromise;
  await expect(dayForm(page, codigo, "Lunes").getByText("Horario guardado.")).toBeVisible();
  const saved = await storedDay(codigo, 1);
  expect(saved?.aperturaMinuto).toBe(8 * 60);
  expect(saved?.cierreMinuto).toBe(18 * 60);

  const invalidBody = replaceFormField(source.postDataBuffer() ?? Buffer.alloc(0), "cierre", "08:00");
  expect(invalidBody).not.toBeNull();
  const rejected = await replayAction(page.context(), source, invalidBody ?? undefined);
  expect(await rejected.text()).toContain("El cierre debe ser posterior a la apertura, dentro del mismo día.");
  const afterReject = await storedDay(codigo, 1);
  expect(afterReject?.aperturaMinuto).toBe(8 * 60);
  expect(afterReject?.cierreMinuto).toBe(18 * 60);

  await saveDay(page, codigo, "Lunes", "08:00", "08:00");
  await expect(dayForm(page, codigo, "Lunes").locator("p[role='alert']")).toHaveText(
    "El cierre debe ser posterior a la apertura, dentro del mismo día.",
  );
  const equalClose = await storedDay(codigo, 1);
  expect(equalClose?.aperturaMinuto).toBe(8 * 60);
  expect(equalClose?.cierreMinuto).toBe(18 * 60);

  await saveDay(page, codigo, "Lunes", "22:00", "02:00");
  await expect(dayForm(page, codigo, "Lunes").locator("p[role='alert']")).toHaveText(
    "El cierre debe ser posterior a la apertura, dentro del mismo día.",
  );
  const overnight = await storedDay(codigo, 1);
  expect(overnight?.aperturaMinuto).toBe(8 * 60);
  expect(overnight?.cierreMinuto).toBe(18 * 60);

  const form = dayForm(page, codigo, "Lunes");
  await form.locator("input[name='apertura']").fill("");
  await form.locator("input[name='cierre']").fill("");
  await form.getByRole("button", { name: "Guardar horario" }).click();
  await expect(form.getByText("El día quedó sin horario.")).toBeVisible();
  expect(await storedDay(codigo, 1)).toBeNull();
});

test("el administrador guarda lunes y domingo; estudiante y profesor no ven ni cambian el horario", async ({
  page,
  browser,
}) => {
  const codigo = uniqueCode("D");
  const studentEmail = uniqueEmail("horario-est");
  const professorEmail = uniqueEmail("horario-pro");
  await register(page, studentEmail);
  await register(page, professorEmail);
  await prisma.usuario.update({ where: { email: professorEmail }, data: { rol: "PROFESOR" } });

  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/salas");
  await createRoom(page, codigo);

  await saveDay(page, codigo, "Lunes", "08:00", "12:00");
  await expect(dayForm(page, codigo, "Lunes").getByText("Horario guardado.")).toBeVisible();

  const requestPromise = page.waitForRequest(
    (request) => request.method() === "POST" && request.url().includes("/salas"),
  );
  await saveDay(page, codigo, "Domingo", "09:00", "13:00");
  const source = await requestPromise;
  await expect(dayForm(page, codigo, "Domingo").getByText("Horario guardado.")).toBeVisible();

  const monday = await storedDay(codigo, 1);
  const sunday = await storedDay(codigo, 7);
  expect(monday?.aperturaMinuto).toBe(8 * 60);
  expect(monday?.cierreMinuto).toBe(12 * 60);
  expect(sunday?.aperturaMinuto).toBe(9 * 60);
  expect(sunday?.cierreMinuto).toBe(13 * 60);

  const tampered = replaceFormField(source.postDataBuffer() ?? Buffer.alloc(0), "apertura", "10:00");
  const body = tampered ? replaceFormField(tampered, "cierre", "15:00") : null;
  expect(body).not.toBeNull();

  const anonymous = await browser.newContext();
  const anonymousResponse = await replayAction(anonymous, source, body ?? undefined);
  expect(await anonymousResponse.text()).toContain("Debes iniciar sesión.");
  await anonymous.close();

  for (const email of [studentEmail, professorEmail]) {
    const context = await browser.newContext();
    const rolePage = await context.newPage();
    await loginAs(rolePage, email, PASSWORD);
    await rolePage.goto("/salas");
    await expect(roomArticle(rolePage, codigo).getByRole("region", { name: "Horario" })).toHaveCount(0);
    await expect(roomArticle(rolePage, codigo).getByRole("button", { name: "Guardar horario" })).toHaveCount(0);
    const response = await replayAction(context, source, body ?? undefined);
    expect(await response.text()).toContain("No autorizado.");
    await context.close();
  }

  const mondayAfter = await storedDay(codigo, 1);
  const sundayAfter = await storedDay(codigo, 7);
  expect(mondayAfter?.aperturaMinuto).toBe(8 * 60);
  expect(mondayAfter?.cierreMinuto).toBe(12 * 60);
  expect(sundayAfter?.aperturaMinuto).toBe(9 * 60);
  expect(sundayAfter?.cierreMinuto).toBe(13 * 60);
});

test("sin sesión /reservas redirige al ingreso y cada rol ve solo sus reservas", async ({ page }) => {
  const slot = upcomingMorning();
  const codigo = uniqueCode("V");
  const owner = uniqueEmail("ve-propia");
  const other = uniqueEmail("ve-ajena");
  const professor = uniqueEmail("ve-pro");
  await register(page, owner);
  await register(page, other);
  await register(page, professor);
  await prisma.usuario.update({ where: { email: professor }, data: { rol: "PROFESOR" } });

  await page.context().clearCookies();
  await page.goto("/reservas");
  await expect(page).toHaveURL(/\/ingreso$/);
  await expect(page.getByRole("link", { name: "Reservas", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar reserva" })).toHaveCount(0);

  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/salas");
  await createRoom(page, codigo);
  await openDay(page, codigo, slot.label);

  await loginAs(page, owner, PASSWORD);
  await page.goto("/reservas");
  await expect(page.getByRole("heading", { name: "Reservas", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reservas", exact: true })).toBeVisible();
  await bookAndConfirm(page, codigo, slot.fecha, "08:00");
  const own = (await reservationsFor(codigo))[0];
  await expect(page.getByRole("article", { name: `Reserva ${own.id}` })).toBeVisible();

  await loginAs(page, other, PASSWORD);
  await page.goto("/reservas");
  await expect(page.getByRole("article", { name: `Reserva ${own.id}` })).toHaveCount(0);
  await expect(page.getByText(owner)).toHaveCount(0);

  await loginAs(page, professor, PASSWORD);
  await page.goto("/reservas");
  await expect(page.getByRole("article", { name: `Reserva ${own.id}` })).toHaveCount(0);

  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/reservas");
  await expect(page.getByRole("article", { name: `Reserva ${own.id}` })).toBeVisible();
  await expect(page.getByRole("article", { name: `Reserva ${own.id}` }).getByText(owner)).toBeVisible();
});

test("confirma 60 minutos, rechaza otra duración o una sala inactiva y no edita la fila", async ({ page }) => {
  const slot = upcomingMorning();
  const codigo = uniqueCode("C");
  const closed = uniqueCode("X");
  const student = uniqueEmail("crea-est");
  const professor = uniqueEmail("crea-pro");
  await register(page, student);
  await register(page, professor);
  await prisma.usuario.update({ where: { email: professor }, data: { rol: "PROFESOR" } });

  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/salas");
  await createRoom(page, codigo);
  await openDay(page, codigo, slot.label);
  await createRoom(page, closed);
  await roomArticle(page, closed).getByRole("button", { name: "Desactivar" }).click();
  await expect(roomArticle(page, closed).getByText("Sala desactivada.")).toBeVisible();
  const inactiveId = (await prisma.sala.findUniqueOrThrow({ where: { codigo: closed } })).id;

  await loginAs(page, student, PASSWORD);
  await page.goto("/reservas");
  const requestPromise = page.waitForRequest((request) => request.method() === "POST" && request.url().includes("/reservas"));
  await bookAndConfirm(page, codigo, slot.fecha, "08:00");
  const source = await requestPromise;
  const created = await reservationsFor(codigo);
  expect(created).toHaveLength(1);
  expect(created[0].estado).toBe("CONFIRMADA");
  expect(created[0].fin.getTime() - created[0].inicio.getTime()).toBe(60 * 60 * 1000);
  expect(created[0].ocupaciones).toHaveLength(2);

  const otherDuration = replaceFormField(source.postDataBuffer() ?? Buffer.alloc(0), "duracion", "90");
  expect(otherDuration).not.toBeNull();
  const rejectedDuration = await replayAction(page.context(), source, otherDuration ?? undefined);
  expect(await rejectedDuration.text()).toContain("La duración debe ser de 60 minutos.");
  expect(await reservationsFor(codigo)).toHaveLength(1);

  const inactiveBody = replaceFormField(source.postDataBuffer() ?? Buffer.alloc(0), "salaId", inactiveId);
  expect(inactiveBody).not.toBeNull();
  const rejectedInactive = await replayAction(page.context(), source, inactiveBody ?? undefined);
  expect(await rejectedInactive.text()).toContain("La sala no está activa.");
  expect(await prisma.reserva.count({ where: { salaId: inactiveId } })).toBe(0);

  const form = page.locator("#crear-reserva");
  await form.locator("select[name='salaId']").selectOption({ label: codigo });
  await form.locator("input[name='fecha']").fill(slot.fecha);
  await form.locator("input[name='hora']").fill("11:00");
  await form.locator("input[name='duracion']").fill("");
  await form.evaluate((node, id) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "id";
    input.value = id;
    node.appendChild(input);
  }, created[0].id);
  await form.getByRole("button", { name: "Confirmar reserva" }).click();
  await expect(form.locator("p[role='alert']")).toHaveText("No se puede editar una reserva.");
  const afterEdit = await reservationsFor(codigo);
  expect(afterEdit).toHaveLength(1);
  expect(afterEdit[0].id).toBe(created[0].id);
  expect(afterEdit[0].inicio.getTime()).toBe(created[0].inicio.getTime());
  expect(afterEdit[0].fin.getTime()).toBe(created[0].fin.getTime());
  expect(afterEdit[0].salaId).toBe(created[0].salaId);

  await loginAs(page, professor, PASSWORD);
  await page.goto("/reservas");
  await bookAndConfirm(page, codigo, slot.fecha, "09:30");

  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/reservas");
  await bookAndConfirm(page, codigo, slot.fecha, "11:00");
  const rows = await reservationsFor(codigo);
  expect(rows).toHaveLength(3);
  expect(rows.every((row) => row.estado === "CONFIRMADA" && row.ocupaciones.length === 2)).toBe(true);
});

test("cancela la propia, rechaza la ajena y el administrador cancela sin volver a ocupar", async ({ page, browser }) => {
  const slot = upcomingMorning();
  const codigo = uniqueCode("K");
  const student = uniqueEmail("cancela-est");
  const professor = uniqueEmail("cancela-pro");
  await register(page, student);
  await register(page, professor);
  await prisma.usuario.update({ where: { email: professor }, data: { rol: "PROFESOR" } });

  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/salas");
  await createRoom(page, codigo);
  await openDay(page, codigo, slot.label);

  await loginAs(page, student, PASSWORD);
  await page.goto("/reservas");
  await bookAndConfirm(page, codigo, slot.fecha, "08:00");
  const first = (await reservationsFor(codigo))[0];
  const firstArticle = page.getByRole("article", { name: `Reserva ${first.id}` });
  const cancelRequest = page.waitForRequest((request) => request.method() === "POST" && request.url().includes("/reservas"));
  await firstArticle.getByRole("button", { name: "Cancelar reserva" }).click();
  const cancelSource = await cancelRequest;
  await expect(firstArticle.getByText("CANCELADA", { exact: true })).toBeVisible();
  const cancelled = (await reservationsFor(codigo))[0];
  expect(cancelled.estado).toBe("CANCELADA");
  expect(cancelled.ocupaciones).toHaveLength(0);

  const secondCancel = await replayAction(page.context(), cancelSource);
  expect(await secondCancel.text()).toContain("La reserva ya está cancelada.");
  const stillCancelled = (await reservationsFor(codigo))[0];
  expect(stillCancelled.estado).toBe("CANCELADA");
  expect(stillCancelled.ocupaciones).toHaveLength(0);

  await bookAndConfirm(page, codigo, slot.fecha, "10:00");
  const second = (await reservationsFor(codigo)).find((row) => row.estado === "CONFIRMADA");
  if (!second) {
    throw new Error("Falta la reserva confirmada.");
  }
  const foreignBody = replaceFormField(cancelSource.postDataBuffer() ?? Buffer.alloc(0), "id", second.id);
  expect(foreignBody).not.toBeNull();

  const professorContext = await browser.newContext();
  const professorPage = await professorContext.newPage();
  await loginAs(professorPage, professor, PASSWORD);
  await professorPage.goto("/reservas");
  await expect(professorPage.getByRole("article", { name: `Reserva ${second.id}` })).toHaveCount(0);
  const forbidden = await replayAction(professorContext, cancelSource, foreignBody ?? undefined);
  expect(await forbidden.text()).toContain("No autorizado.");
  await professorContext.close();
  const protectedRow = await prisma.reserva.findUniqueOrThrow({
    where: { id: second.id },
    include: { ocupaciones: true },
  });
  expect(protectedRow.estado).toBe("CONFIRMADA");
  expect(protectedRow.ocupaciones).toHaveLength(2);

  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/reservas");
  const adminArticle = page.getByRole("article", { name: `Reserva ${second.id}` });
  await adminArticle.getByRole("button", { name: "Cancelar reserva" }).click();
  await expect(adminArticle.getByText("CANCELADA", { exact: true })).toBeVisible();
  const adminCancelled = await prisma.reserva.findUniqueOrThrow({
    where: { id: second.id },
    include: { ocupaciones: true },
  });
  expect(adminCancelled.estado).toBe("CANCELADA");
  expect(adminCancelled.ocupaciones).toHaveLength(0);
});

test("dos salas confirman el mismo intervalo", async ({ page }) => {
  const slot = upcomingMorning();
  const first = uniqueCode("A");
  const second = uniqueCode("B");
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/salas");
  await createRoom(page, first);
  await openDay(page, first, slot.label);
  await createRoom(page, second);
  await openDay(page, second, slot.label);

  await page.goto("/reservas");
  await bookAndConfirm(page, first, slot.fecha, "08:00");
  await bookAndConfirm(page, second, slot.fecha, "08:00");

  const left = await reservationsFor(first);
  const right = await reservationsFor(second);
  expect(left).toHaveLength(1);
  expect(right).toHaveLength(1);
  expect(left[0].estado).toBe("CONFIRMADA");
  expect(right[0].estado).toBe("CONFIRMADA");
  expect(left[0].inicio.getTime()).toBe(right[0].inicio.getTime());
  expect(left[0].ocupaciones).toHaveLength(2);
  expect(right[0].ocupaciones).toHaveLength(2);
});

test("un inicio exactamente al terminar otra reserva no entra en conflicto", async ({ page }) => {
  const slot = upcomingMorning();
  const codigo = uniqueCode("Y");
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/salas");
  await createRoom(page, codigo);
  await openDay(page, codigo, slot.label);

  await page.goto("/reservas");
  await bookAndConfirm(page, codigo, slot.fecha, "08:00");
  await bookAndConfirm(page, codigo, slot.fecha, "09:00");

  const rows = [...(await reservationsFor(codigo))].sort((left, right) => left.inicio.getTime() - right.inicio.getTime());
  expect(rows).toHaveLength(2);
  expect(rows.every((row) => row.estado === "CONFIRMADA")).toBe(true);
  const instants = rows.flatMap((row) => row.ocupaciones.map((item) => item.instante.getTime()));
  expect(new Set(instants).size).toBe(4);
  expect(rows[1].inicio.getTime() - rows[0].inicio.getTime()).toBe(60 * 60 * 1000);
});

test("cancelar y crear otra en el mismo intervalo deja dos registros distintos", async ({ page }) => {
  const slot = upcomingMorning();
  const codigo = uniqueCode("N");
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/salas");
  await createRoom(page, codigo);
  await openDay(page, codigo, slot.label);

  await page.goto("/reservas");
  await bookAndConfirm(page, codigo, slot.fecha, "08:00");
  const original = (await reservationsFor(codigo))[0];
  await page.getByRole("article", { name: `Reserva ${original.id}` }).getByRole("button", { name: "Cancelar reserva" }).click();
  await expect(page.getByRole("article", { name: `Reserva ${original.id}` }).getByText("CANCELADA", { exact: true })).toBeVisible();

  await bookAndConfirm(page, codigo, slot.fecha, "08:00");
  const rows = await reservationsFor(codigo);
  expect(rows).toHaveLength(2);
  expect(rows.map((row) => row.id).sort()).not.toEqual([original.id, original.id]);
  const cancelled = rows.find((row) => row.id === original.id);
  const created = rows.find((row) => row.id !== original.id);
  expect(cancelled?.estado).toBe("CANCELADA");
  expect(cancelled?.ocupaciones).toHaveLength(0);
  expect(created?.estado).toBe("CONFIRMADA");
  expect(created?.inicio.getTime()).toBe(original.inicio.getTime());
  expect(created?.fin.getTime()).toBe(original.fin.getTime());
  expect(created?.salaId).toBe(original.salaId);
  expect(created?.ocupaciones).toHaveLength(2);
});

test("sábado y domingo con horario no crean reservas", async ({ page }) => {
  const weekday = upcomingMorning();
  const saturday = upcomingWeekday(6);
  const sunday = upcomingWeekday(7);
  const codigo = uniqueCode("W");
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/salas");
  await createRoom(page, codigo);
  await openDay(page, codigo, weekday.label);
  await openDay(page, codigo, saturday.label);
  await openDay(page, codigo, sunday.label);

  await page.goto("/reservas");
  const requestPromise = page.waitForRequest((request) => request.method() === "POST" && request.url().includes("/reservas"));
  await bookAndConfirm(page, codigo, weekday.fecha, "08:00");
  const source = await requestPromise;

  await book(page, codigo, saturday.fecha, "08:00");
  await expect(page.locator("#crear-reserva").locator("p[role='alert']")).toHaveText(
    "Solo se puede reservar de lunes a viernes.",
  );
  const saturdayBody = replaceFormField(source.postDataBuffer() ?? Buffer.alloc(0), "fecha", saturday.fecha);
  const sundayBody = replaceFormField(source.postDataBuffer() ?? Buffer.alloc(0), "fecha", sunday.fecha);
  expect(saturdayBody).not.toBeNull();
  expect(sundayBody).not.toBeNull();
  const rejectedSaturday = await replayAction(page.context(), source, saturdayBody ?? undefined);
  const rejectedSunday = await replayAction(page.context(), source, sundayBody ?? undefined);
  expect(await rejectedSaturday.text()).toContain("Solo se puede reservar de lunes a viernes.");
  expect(await rejectedSunday.text()).toContain("Solo se puede reservar de lunes a viernes.");

  const rows = await reservationsFor(codigo);
  expect(rows).toHaveLength(1);
  expect(rows[0].inicio.getTime()).toBe(weekday.start.getTime());
});

async function occupancyCount(codigo: string) {
  const sala = await prisma.sala.findUniqueOrThrow({ where: { codigo } });
  return prisma.reservaOcupacion.count({ where: { salaId: sala.id } });
}

async function removeReservation(id: string) {
  await prisma.reservaOcupacion.deleteMany({ where: { reservaId: id } });
  await prisma.reserva.delete({ where: { id } });
}

test("sin horario o con el fin posterior al cierre no inserta reserva ni ocupación", async ({ page }) => {
  const slot = upcomingMorning();
  const open = uniqueCode("O");
  const missing = uniqueCode("M");
  const short = uniqueCode("T");
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/salas");
  await createRoom(page, open);
  await openDay(page, open, slot.label);
  await createRoom(page, missing);
  await createRoom(page, short);
  await saveDay(page, short, slot.label, "08:00", "08:30");
  await expect(dayForm(page, short, slot.label).getByText("Horario guardado.")).toBeVisible();

  await page.goto("/reservas");
  const requestPromise = page.waitForRequest((request) => request.method() === "POST" && request.url().includes("/reservas"));
  await bookAndConfirm(page, open, slot.fecha, "08:00");
  const source = await requestPromise;
  const missingId = (await prisma.sala.findUniqueOrThrow({ where: { codigo: missing } })).id;
  const shortId = (await prisma.sala.findUniqueOrThrow({ where: { codigo: short } })).id;
  const noHours = replaceFormField(source.postDataBuffer() ?? Buffer.alloc(0), "salaId", missingId);
  const afterClose = replaceFormField(source.postDataBuffer() ?? Buffer.alloc(0), "salaId", shortId);
  expect(noHours).not.toBeNull();
  expect(afterClose).not.toBeNull();

  const missingResponse = await replayAction(page.context(), source, noHours ?? undefined);
  const closeResponse = await replayAction(page.context(), source, afterClose ?? undefined);
  expect(await missingResponse.text()).toContain("Ese día no tiene horario.");
  expect(await closeResponse.text()).toContain("El fin supera el cierre.");
  expect(await reservationsFor(missing)).toHaveLength(0);
  expect(await reservationsFor(short)).toHaveLength(0);
  expect(await occupancyCount(missing)).toBe(0);
  expect(await occupancyCount(short)).toBe(0);
});

test("dos creaciones simultáneas dejan una reserva y exactamente dos ocupaciones", async ({ page }) => {
  const slot = upcomingMorning();
  const codigo = uniqueCode("Z");
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/salas");
  await createRoom(page, codigo);
  await openDay(page, codigo, slot.label);
  await page.goto("/reservas");
  const requestPromise = page.waitForRequest((request) => request.method() === "POST" && request.url().includes("/reservas"));
  await bookAndConfirm(page, codigo, slot.fecha, "08:00");
  const source = await requestPromise;
  const seeded = (await reservationsFor(codigo))[0];
  await removeReservation(seeded.id);

  const [first, second] = await Promise.all([
    replayAction(page.context(), source),
    replayAction(page.context(), source),
  ]);
  const texts = [await first.text(), await second.text()];
  expect(texts.filter((text) => text.includes("Reserva confirmada."))).toHaveLength(1);
  expect(texts.filter((text) => text.includes("Ese horario ya está ocupado."))).toHaveLength(1);
  expect(texts.some((text) => text.includes("No se pudo completar la reserva. Inténtalo de nuevo."))).toBe(false);

  const rows = await reservationsFor(codigo);
  expect(rows).toHaveLength(1);
  expect(rows[0].estado).toBe("CONFIRMADA");
  expect(rows[0].ocupaciones).toHaveLength(2);
  expect(await occupancyCount(codigo)).toBe(2);
});

test("el índice único rechaza dos ocupaciones del mismo instante sin dejar un duplicado", async () => {
  const admin = await prisma.usuario.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
  const codigo = uniqueCode("U");
  const slot = upcomingMorning();
  const sala = await prisma.sala.create({
    data: {
      nombre: `Sala ${codigo}`,
      codigo,
      codigoNormalizado: codigo.toLowerCase(),
      ubicacion: "Bloque horario",
      capacidad: 4,
      estado: "ACTIVA",
    },
  });
  const reserva = await prisma.reserva.create({
    data: {
      salaId: sala.id,
      usuarioId: admin.id,
      inicio: slot.start,
      fin: new Date(slot.start.getTime() + 60 * 60 * 1000),
      estado: "CONFIRMADA",
    },
  });
  await prisma.reservaOcupacion.create({
    data: { reservaId: reserva.id, salaId: sala.id, instante: slot.start },
  });

  let rejected = false;
  try {
    await prisma.reservaOcupacion.create({
      data: { reservaId: reserva.id, salaId: sala.id, instante: slot.start },
    });
  } catch (error) {
    rejected = true;
    expect(error).toMatchObject({ code: "P2002" });
  }

  expect(rejected).toBe(true);
  expect(await prisma.reservaOcupacion.count({ where: { salaId: sala.id, instante: slot.start } })).toBe(1);
  expect(await prisma.reserva.count({ where: { salaId: sala.id } })).toBe(1);
});

test("un bloqueo de otra conexión no se clasifica como solape ni deja filas", async ({ page }) => {
  const slot = upcomingMorning();
  const codigo = uniqueCode("L");
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/salas");
  await createRoom(page, codigo);
  await openDay(page, codigo, slot.label);
  await page.goto("/reservas");
  const requestPromise = page.waitForRequest((request) => request.method() === "POST" && request.url().includes("/reservas"));
  await bookAndConfirm(page, codigo, slot.fecha, "08:00");
  const source = await requestPromise;
  await removeReservation((await reservationsFor(codigo))[0].id);

  const holder = new PrismaClient();
  let release = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started = () => {};
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  const holding = holder.$transaction(
    async () => {
      started();
      await released;
    },
    { maxWait: 5_000, timeout: 30_000 },
  );

  const locked = new PrismaClient();
  try {
    await ready;
    let busyError: unknown;
    try {
      await locked.$executeRawUnsafe("BEGIN IMMEDIATE");
    } catch (error) {
      busyError = error;
    }
    const busyMessage = busyError instanceof Error ? busyError.message : "";
    expect(busyError).toMatchObject({ code: "P2010" });
    expect(busyError).not.toMatchObject({ code: "P2002" });
    expect(busyMessage).toContain("database is locked");
    expect(busyMessage).toContain("Code: `5`");

    const response = await replayAction(page.context(), source);
    const text = await response.text();
    expect(text).toContain("No se pudo completar la reserva. Inténtalo de nuevo.");
    expect(text).not.toContain("Ese horario ya está ocupado.");
  } finally {
    release();
    await holding;
    await holder.$disconnect();
    await locked.$disconnect();
  }

  const sala = await prisma.sala.findUniqueOrThrow({ where: { codigo } });
  const admin = await prisma.usuario.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
  const expired = new PrismaClient();
  try {
    let closed = false;
    try {
      await expired.$transaction(
        async (tx) => {
          await tx.reserva.create({
            data: {
              salaId: sala.id,
              usuarioId: admin.id,
              inicio: slot.start,
              fin: new Date(slot.start.getTime() + 60 * 60 * 1000),
              estado: "CONFIRMADA",
            },
          });
          await new Promise((resolve) => setTimeout(resolve, 400));
          await tx.$queryRawUnsafe("SELECT 1");
        },
        { maxWait: 2_000, timeout: 100 },
      );
    } catch (error) {
      closed = true;
      expect(error).toMatchObject({ code: "P2028" });
      expect(error).not.toMatchObject({ code: "P2002" });
    }
    expect(closed).toBe(true);
  } finally {
    await expired.$disconnect();
  }

  expect(await reservationsFor(codigo)).toHaveLength(0);
  expect(await occupancyCount(codigo)).toBe(0);
});

const MSG_DEACTIVATION_BLOCKED = "No se puede desactivar la sala mientras tenga una reserva que no ha terminado.";

async function seedReservation(codigo: string, inicio: Date, fin: Date, estado: string) {
  const sala = await prisma.sala.findUniqueOrThrow({ where: { codigo } });
  const admin = await prisma.usuario.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
  return prisma.reserva.create({
    data: { salaId: sala.id, usuarioId: admin.id, inicio, fin, estado },
  });
}

test("una reserva vigente impide desactivar y el historial se conserva", async ({ page }) => {
  const slot = upcomingMorning();
  const future = uniqueCode("F");
  const progress = uniqueCode("P");
  const cancelled = uniqueCode("Q");
  const finished = uniqueCode("R");
  const now = new Date();

  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/salas");
  await createRoom(page, future);
  await openDay(page, future, slot.label);
  await createRoom(page, progress);
  await createRoom(page, cancelled);
  await openDay(page, cancelled, slot.label);
  await createRoom(page, finished);

  await page.goto("/reservas");
  const requestPromise = page.waitForRequest((request) => request.method() === "POST" && request.url().includes("/reservas"));
  await bookAndConfirm(page, future, slot.fecha, "08:00");
  const source = await requestPromise;
  const futureRow = (await reservationsFor(future))[0];

  await page.goto("/salas");
  const futureArticle = roomArticle(page, future);
  await futureArticle.getByRole("button", { name: "Desactivar" }).click();
  await expect(futureArticle.locator("p[role='alert']")).toHaveText(MSG_DEACTIVATION_BLOCKED);
  await expect(futureArticle.getByText("Activa", { exact: true })).toBeVisible();
  const blockedFuture = await prisma.sala.findUniqueOrThrow({ where: { codigo: future } });
  expect(blockedFuture.estado).toBe("ACTIVA");
  const keptFuture = await prisma.reserva.findUniqueOrThrow({ where: { id: futureRow.id } });
  expect(keptFuture.estado).toBe("CONFIRMADA");
  expect(keptFuture.fin.getTime()).toBe(futureRow.fin.getTime());

  const inProgress = await seedReservation(progress, new Date(now.getTime() - 30 * 60 * 1000), new Date(now.getTime() + 30 * 60 * 1000), "CONFIRMADA");
  const progressArticle = roomArticle(page, progress);
  await progressArticle.getByRole("button", { name: "Desactivar" }).click();
  await expect(progressArticle.locator("p[role='alert']")).toHaveText(MSG_DEACTIVATION_BLOCKED);
  await expect(progressArticle.getByText("Activa", { exact: true })).toBeVisible();
  expect((await prisma.sala.findUniqueOrThrow({ where: { codigo: progress } })).estado).toBe("ACTIVA");
  expect(await prisma.reserva.findUnique({ where: { id: inProgress.id } })).not.toBeNull();

  await page.goto("/reservas");
  await bookAndConfirm(page, cancelled, slot.fecha, "08:00");
  const cancelledRow = (await reservationsFor(cancelled))[0];
  await page.getByRole("article", { name: `Reserva ${cancelledRow.id}` }).getByRole("button", { name: "Cancelar reserva" }).click();
  await expect(page.getByRole("article", { name: `Reserva ${cancelledRow.id}` }).getByText("CANCELADA", { exact: true })).toBeVisible();

  await page.goto("/salas");
  const cancelledArticle = roomArticle(page, cancelled);
  await cancelledArticle.getByRole("button", { name: "Desactivar" }).click();
  await expect(cancelledArticle.getByText("Sala desactivada.")).toBeVisible();
  await expect(cancelledArticle.getByText("Inactiva", { exact: true })).toBeVisible();
  expect((await prisma.sala.findUniqueOrThrow({ where: { codigo: cancelled } })).estado).toBe("INACTIVA");
  const storedCancelled = await prisma.reserva.findUniqueOrThrow({ where: { id: cancelledRow.id } });
  expect(storedCancelled.estado).toBe("CANCELADA");

  const ended = await seedReservation(finished, new Date(now.getTime() - 2 * 60 * 60 * 1000), new Date(now.getTime() - 60 * 1000), "CONFIRMADA");
  const finishedArticle = roomArticle(page, finished);
  await finishedArticle.getByRole("button", { name: "Desactivar" }).click();
  await expect(finishedArticle.getByText("Sala desactivada.")).toBeVisible();
  expect((await prisma.sala.findUniqueOrThrow({ where: { codigo: finished } })).estado).toBe("INACTIVA");
  expect((await prisma.reserva.findUniqueOrThrow({ where: { id: ended.id } })).estado).toBe("CONFIRMADA");

  await finishedArticle.getByRole("button", { name: "Activar" }).click();
  await expect(finishedArticle.getByText("Sala activada.")).toBeVisible();
  await expect(finishedArticle.getByText("Activa", { exact: true })).toBeVisible();
  expect((await prisma.sala.findUniqueOrThrow({ where: { codigo: finished } })).estado).toBe("ACTIVA");
  expect(await prisma.reserva.count({ where: { salaId: ended.salaId } })).toBe(1);

  await finishedArticle.getByRole("button", { name: "Desactivar" }).click();
  await expect(finishedArticle.getByText("Sala desactivada.")).toBeVisible();
  const inactiveBody = replaceFormField(source.postDataBuffer() ?? Buffer.alloc(0), "salaId", ended.salaId);
  expect(inactiveBody).not.toBeNull();
  const rejected = await replayAction(page.context(), source, inactiveBody ?? undefined);
  expect(await rejected.text()).toContain("La sala no está activa.");
  const preserved = await prisma.reserva.findUniqueOrThrow({ where: { id: ended.id } });
  expect(preserved.estado).toBe("CONFIRMADA");
  expect(preserved.inicio.getTime()).toBe(ended.inicio.getTime());
  expect(preserved.fin.getTime()).toBe(ended.fin.getTime());
  expect(await prisma.reserva.count({ where: { salaId: ended.salaId } })).toBe(1);
});

test("un estudiante que afirma ser administrador no cambia horarios, no cancela ajenas y no ve el listado completo", async ({
  page,
  browser,
}) => {
  const slot = upcomingMorning();
  const codigo = uniqueCode("S");
  const student = uniqueEmail("afirma-est");
  await register(page, student);

  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/salas");
  await createRoom(page, codigo);
  const schedulePromise = page.waitForRequest((request) => request.method() === "POST" && request.url().includes("/salas"));
  await openDay(page, codigo, slot.label);
  const scheduleSource = await schedulePromise;

  await page.goto("/reservas");
  await bookAndConfirm(page, codigo, slot.fecha, "08:00");
  await bookAndConfirm(page, codigo, slot.fecha, "10:00");
  const rows = await reservationsFor(codigo);
  const kept = rows.find((row) => row.inicio.getTime() === slot.start.getTime());
  const sacrificed = rows.find((row) => row.inicio.getTime() !== slot.start.getTime());
  if (!kept || !sacrificed) {
    throw new Error("Faltan las dos reservas del administrador.");
  }
  const cancelPromise = page.waitForRequest((request) => request.method() === "POST" && request.url().includes("/reservas"));
  await page.getByRole("article", { name: `Reserva ${sacrificed.id}` }).getByRole("button", { name: "Cancelar reserva" }).click();
  const cancelSource = await cancelPromise;
  await expect(page.getByRole("article", { name: `Reserva ${sacrificed.id}` }).getByText("CANCELADA", { exact: true })).toBeVisible();

  const scheduleBody = claimAdministrator(
    replaceFormField(
      replaceFormField(scheduleSource.postDataBuffer() ?? Buffer.alloc(0), "apertura", "10:00") ?? Buffer.alloc(0),
      "cierre",
      "16:00",
    ) ?? Buffer.alloc(0),
  );
  const cancelBody = claimAdministrator(
    replaceFormField(cancelSource.postDataBuffer() ?? Buffer.alloc(0), "id", kept.id) ?? Buffer.alloc(0),
  );
  expect(scheduleBody?.toString("latin1")).toContain('name="_1_rol"');
  expect(cancelBody?.toString("latin1")).toContain("ADMINISTRADOR");

  const studentContext = await browser.newContext();
  const studentPage = await studentContext.newPage();
  await loginAs(studentPage, student, PASSWORD);
  const scheduleResponse = await replayAction(studentContext, scheduleSource, scheduleBody ?? undefined);
  const cancelResponse = await replayAction(studentContext, cancelSource, cancelBody ?? undefined);
  expect(await scheduleResponse.text()).toContain("No autorizado.");
  expect(await cancelResponse.text()).toContain("No autorizado.");

  await studentPage.goto("/reservas?rol=ADMINISTRADOR");
  await expect(studentPage.getByRole("article", { name: `Reserva ${kept.id}` })).toHaveCount(0);
  await expect(studentPage.getByText(ADMIN_EMAIL)).toHaveCount(0);
  await expect(studentPage.getByText("No hay reservas.")).toBeVisible();
  await studentContext.close();

  const day = await prisma.horarioSala.findFirstOrThrow({
    where: { salaId: kept.salaId, aperturaMinuto: 8 * 60, cierreMinuto: 18 * 60 },
  });
  expect(day.aperturaMinuto).toBe(8 * 60);
  expect(day.cierreMinuto).toBe(18 * 60);
  const protectedRow = await prisma.reserva.findUniqueOrThrow({
    where: { id: kept.id },
    include: { ocupaciones: true },
  });
  expect(protectedRow.estado).toBe("CONFIRMADA");
  expect(protectedRow.usuarioId).not.toBe((await prisma.usuario.findUniqueOrThrow({ where: { email: student } })).id);
  expect(protectedRow.ocupaciones).toHaveLength(2);
});

test("el servidor rechaza las 08:15 y un inicio anterior a la apertura", async ({ page }) => {
  const slot = upcomingMorning();
  const grid = uniqueCode("G");
  const early = uniqueCode("E");
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/salas");
  await createRoom(page, grid);
  await openDay(page, grid, slot.label);
  await createRoom(page, early);
  await saveDay(page, early, slot.label, "09:00", "18:00");
  await expect(dayForm(page, early, slot.label).getByText("Horario guardado.")).toBeVisible();

  await page.goto("/reservas");
  const requestPromise = page.waitForRequest((request) => request.method() === "POST" && request.url().includes("/reservas"));
  await bookAndConfirm(page, grid, slot.fecha, "08:00");
  const source = await requestPromise;
  const quarter = replaceFormField(source.postDataBuffer() ?? Buffer.alloc(0), "hora", "08:15");
  expect(quarter).not.toBeNull();
  const quarterResponse = await replayAction(page.context(), source, quarter ?? undefined);
  expect(await quarterResponse.text()).toContain("El inicio debe caer en un minuto 00 o 30.");
  expect(await reservationsFor(grid)).toHaveLength(1);

  const earlyId = (await prisma.sala.findUniqueOrThrow({ where: { codigo: early } })).id;
  const beforeOpen = replaceFormField(source.postDataBuffer() ?? Buffer.alloc(0), "salaId", earlyId);
  expect(beforeOpen).not.toBeNull();
  const earlyResponse = await replayAction(page.context(), source, beforeOpen ?? undefined);
  expect(await earlyResponse.text()).toContain("El inicio es anterior a la apertura.");
  expect(await reservationsFor(early)).toHaveLength(0);
  expect(await occupancyCount(early)).toBe(0);
});

test("cancelar en el instante de inicio conserva la reserva y sus ocupaciones", async ({ page }) => {
  const slot = upcomingMorning();
  const codigo = uniqueCode("N");
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/salas");
  await createRoom(page, codigo);
  await openDay(page, codigo, slot.label);
  await page.goto("/reservas");
  await bookAndConfirm(page, codigo, slot.fecha, "08:00");
  const future = (await reservationsFor(codigo))[0];
  const cancelPromise = page.waitForRequest((request) => request.method() === "POST" && request.url().includes("/reservas"));
  await page.getByRole("article", { name: `Reserva ${future.id}` }).getByRole("button", { name: "Cancelar reserva" }).click();
  const cancelSource = await cancelPromise;

  const inicio = new Date();
  const admin = await prisma.usuario.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
  const seeded = await prisma.reserva.create({
    data: {
      salaId: future.salaId,
      usuarioId: admin.id,
      inicio,
      fin: new Date(inicio.getTime() + 60 * 60 * 1000),
      estado: "CONFIRMADA",
      ocupaciones: {
        create: [inicio, new Date(inicio.getTime() + 30 * 60 * 1000)].map((instante) => ({
          salaId: future.salaId,
          instante,
        })),
      },
    },
    include: { ocupaciones: true },
  });
  const body = replaceFormField(cancelSource.postDataBuffer() ?? Buffer.alloc(0), "id", seeded.id);
  expect(body).not.toBeNull();
  const response = await replayAction(page.context(), cancelSource, body ?? undefined);
  expect(await response.text()).toContain("Solo se puede cancelar antes del inicio.");
  const stored = await prisma.reserva.findUniqueOrThrow({
    where: { id: seeded.id },
    include: { ocupaciones: true },
  });
  expect(stored.estado).toBe("CONFIRMADA");
  expect(stored.inicio.getTime()).toBe(seeded.inicio.getTime());
  expect(stored.ocupaciones).toHaveLength(2);
});

test("las claves foráneas rechazan borrar un padre con hijos e insertar un hijo sin padre", async () => {
  const pragma = await prisma.$queryRawUnsafe<Array<{ foreign_keys: number | bigint }>>("PRAGMA foreign_keys");
  expect(Number(pragma[0]?.foreign_keys)).toBe(1);

  const codigo = uniqueCode("FK");
  const usuario = await prisma.usuario.create({
    data: { email: uniqueEmail("fk"), passwordHash: "hash", rol: "ESTUDIANTE" },
  });
  const sala = await prisma.sala.create({
    data: {
      nombre: `Sala ${codigo}`,
      codigo,
      codigoNormalizado: codigo.toLowerCase(),
      ubicacion: "Bloque horario",
      capacidad: 4,
      estado: "ACTIVA",
    },
  });
  const horario = await prisma.horarioSala.create({
    data: { salaId: sala.id, dia: 1, aperturaMinuto: 8 * 60, cierreMinuto: 18 * 60 },
  });
  const inicio = new Date("2026-10-14T13:00:00.000Z");
  const reserva = await prisma.reserva.create({
    data: {
      salaId: sala.id,
      usuarioId: usuario.id,
      inicio,
      fin: new Date(inicio.getTime() + 60 * 60 * 1000),
      estado: "CONFIRMADA",
    },
  });
  const ocupacion = await prisma.reservaOcupacion.create({
    data: { reservaId: reserva.id, salaId: sala.id, instante: inicio },
  });

  await expect(prisma.sala.delete({ where: { id: sala.id } })).rejects.toMatchObject({ code: "P2003" });
  await expect(prisma.usuario.delete({ where: { id: usuario.id } })).rejects.toMatchObject({ code: "P2003" });
  await expect(prisma.reserva.delete({ where: { id: reserva.id } })).rejects.toMatchObject({ code: "P2003" });
  expect(await prisma.sala.findUnique({ where: { id: sala.id } })).not.toBeNull();
  expect(await prisma.usuario.findUnique({ where: { id: usuario.id } })).not.toBeNull();
  expect(await prisma.reserva.findUnique({ where: { id: reserva.id } })).not.toBeNull();
  expect(await prisma.horarioSala.findUnique({ where: { id: horario.id } })).not.toBeNull();
  expect(await prisma.reservaOcupacion.findUnique({ where: { id: ocupacion.id } })).not.toBeNull();

  await expect(
    prisma.horarioSala.create({
      data: { salaId: "sala-inexistente", dia: 2, aperturaMinuto: 8 * 60, cierreMinuto: 10 * 60 },
    }),
  ).rejects.toMatchObject({ code: "P2003" });
  await expect(
    prisma.reserva.create({
      data: {
        salaId: "sala-inexistente",
        usuarioId: usuario.id,
        inicio,
        fin: new Date(inicio.getTime() + 60 * 60 * 1000),
        estado: "CONFIRMADA",
      },
    }),
  ).rejects.toMatchObject({ code: "P2003" });
  await expect(
    prisma.reservaOcupacion.create({
      data: { reservaId: "reserva-inexistente", salaId: sala.id, instante: new Date(inicio.getTime() + 30 * 60 * 1000) },
    }),
  ).rejects.toMatchObject({ code: "P2003" });
  expect(await prisma.horarioSala.count({ where: { salaId: "sala-inexistente" } })).toBe(0);
  expect(await prisma.reserva.count({ where: { salaId: "sala-inexistente" } })).toBe(0);
  expect(await prisma.reservaOcupacion.count({ where: { reservaId: "reserva-inexistente" } })).toBe(0);
});
