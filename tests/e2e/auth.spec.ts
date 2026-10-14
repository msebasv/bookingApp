import { execFileSync } from "node:child_process";
import { expect, test, type BrowserContext, type Page, type Request } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.BOOKINGAPP_E2E_DATABASE_URL ?? "file:./e2e.db";
process.env.DATABASE_URL = databaseUrl;

const prisma = new PrismaClient();
const COOKIE = "bookingapp_session";
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const PASSWORD = "secreto12";
const ADMIN_EMAIL = "admin@bookingapp.test";
const ADMIN_PASSWORD = "adminpass1";

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await prisma.$disconnect();
});

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@bookingapp.test`;
}

async function addHiddenRole(page: Page, rol: string) {
  await page.locator("form").evaluate((form, value) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "rol";
    input.value = value;
    form.appendChild(input);
  }, rol);
}

async function submitRegister(page: Page, email: string, password: string, rol?: string) {
  await page.goto("/registro");
  if (rol) {
    await addHiddenRole(page, rol);
  }
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  const responsePromise = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().includes("/registro"),
  );
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  const response = await responsePromise;
  let body = "";
  try {
    body = await response.text();
  } catch {
    body = "";
  }
  expect(body).not.toContain(password);
  expect(response.headers().location ?? "").not.toContain(password);
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/ingreso");
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
}

async function loginAs(page: Page, email: string, password: string) {
  await login(page, email, password);
  await expect(page.getByText(`Sesión activa para ${email}`)).toBeVisible();
}

async function submitAssign(page: Page) {
  const response = page.waitForResponse(
    (result) => result.request().method() === "POST" && result.url().includes("/admin/roles"),
  );
  await page.getByRole("button", { name: "Asignar rol" }).click();
  await response;
}

async function replayAssign(context: BrowserContext, source: Request) {
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
    data: source.postDataBuffer() ?? undefined,
  });
}

function bogotaHour(date: Date) {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return Number(hour);
}

function assertBogotaInstant(date: Date, label: string) {
  const drift = Math.abs(date.getTime() - Date.now());
  expect(drift, `${label} debe ser el instante real, no la hora local escrita como UTC`).toBeLessThan(60_000);
  expect(bogotaHour(date)).toBe((date.getUTCHours() + 24 - 5) % 24);
}

test("registro aceptado, duplicado y contraseña corta", async ({ page }) => {
  const email = uniqueEmail("registro");
  await submitRegister(page, email, PASSWORD);
  await expect(page.getByText("Cuenta creada. Ya puedes iniciar sesión.")).toBeVisible();

  const stored = await prisma.usuario.findUnique({ where: { email } });
  expect(stored).not.toBeNull();
  expect(stored?.passwordHash).not.toBe(PASSWORD);
  expect(stored?.passwordHash.startsWith("$2")).toBe(true);
  expect(stored?.rol).toBe("ESTUDIANTE");
  assertBogotaInstant(stored!.creadoEn, "creadoEn");

  await submitRegister(page, email, "otrapass1");
  await expect(page.locator("p[role='alert']")).toHaveText("Ese correo ya está registrado.");
  expect(await prisma.usuario.count({ where: { email } })).toBe(1);

  const shortEmail = uniqueEmail("corta");
  await submitRegister(page, shortEmail, "corta1");
  await expect(page.locator("p[role='alert']")).toHaveText("La contraseña debe tener al menos 8 caracteres.");
  expect(await prisma.usuario.findUnique({ where: { email: shortEmail } })).toBeNull();

  await login(page, shortEmail, "corta1");
  await expect(page.locator("p[role='alert']")).toHaveText("Correo o contraseña incorrectos.");

  await login(page, email, "otrapass1");
  await expect(page.locator("p[role='alert']")).toHaveText("Correo o contraseña incorrectos.");

  await loginAs(page, email, PASSWORD);
});

test("credenciales válidas abren sesión e inválidas no crean fila ni cookie", async ({ page, context }) => {
  const email = uniqueEmail("sesion");
  await submitRegister(page, email, PASSWORD);
  const before = await prisma.sesion.count();

  await login(page, email, "clave-mala");
  await expect(page.locator("p[role='alert']")).toHaveText("Correo o contraseña incorrectos.");
  expect(await prisma.sesion.count()).toBe(before);
  expect((await context.cookies()).some((cookie) => cookie.name === COOKIE)).toBe(false);

  await loginAs(page, email, PASSWORD);
  await expect(page.getByText("Sesión activa")).toBeVisible();

  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email } });
  const sesion = await prisma.sesion.findFirstOrThrow({
    where: { usuarioId: usuario.id },
    orderBy: { creadoEn: "desc" },
  });
  expect(sesion.expiraEn.getTime() - sesion.creadoEn.getTime()).toBe(TWELVE_HOURS_MS);
  assertBogotaInstant(sesion.creadoEn, "inicio de sesión");
  expect(bogotaHour(sesion.expiraEn)).toBe((bogotaHour(sesion.creadoEn) + 12) % 24);

  const cookie = (await context.cookies()).find((item) => item.name === COOKIE);
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.value).toBe(sesion.id);
  expect(["ESTUDIANTE", "PROFESOR", "ADMINISTRADOR"]).not.toContain(cookie?.value);
});

test("cerrar sesión deja de autorizar la cuenta", async ({ page }) => {
  const email = uniqueEmail("salida");
  await submitRegister(page, email, PASSWORD);
  await loginAs(page, email, PASSWORD);
  await expect(page.getByText("Sesión activa")).toBeVisible();

  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email } });
  const sesion = await prisma.sesion.findFirstOrThrow({ where: { usuarioId: usuario.id } });

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
  await page.goto("/cuenta");
  await expect(page.locator("p[role='alert']")).toHaveText("No autorizado.");
  expect(await prisma.sesion.findUnique({ where: { id: sesion.id } })).toBeNull();
});

test("una sesión vigente autoriza y la misma sesión vencida se rechaza", async ({ page }) => {
  const email = uniqueEmail("vigencia");
  await submitRegister(page, email, PASSWORD);
  await loginAs(page, email, PASSWORD);
  await expect(page.getByText("Sesión activa")).toBeVisible();
  await expect(page.getByText("Rol: ESTUDIANTE")).toBeVisible();

  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email } });
  const sesion = await prisma.sesion.findFirstOrThrow({ where: { usuarioId: usuario.id } });
  expect(sesion.expiraEn.getTime()).toBeGreaterThan(Date.now());

  await prisma.sesion.update({
    where: { id: sesion.id },
    data: { expiraEn: new Date(Date.now() - 1000) },
  });

  await page.goto("/cuenta");
  await expect(page.locator("p[role='alert']")).toHaveText("No autorizado.");
  expect(await prisma.sesion.findUnique({ where: { id: sesion.id } })).toBeNull();
});

test("el script crea un solo administrador", async () => {
  await prisma.usuario.deleteMany({ where: { rol: "ADMINISTRADOR" } });

  const first = execFileSync(process.execPath, ["scripts/init-admin.js"], {
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
    },
  });
  expect(first).toContain("Administrador creado.");
  expect(await prisma.usuario.count({ where: { rol: "ADMINISTRADOR" } })).toBe(1);

  const second = execFileSync(process.execPath, ["scripts/init-admin.js"], {
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      ADMIN_EMAIL: "otro-admin@bookingapp.test",
      ADMIN_PASSWORD,
    },
  });
  expect(second).toContain("Ya existe un administrador. No se creó otro.");
  expect(await prisma.usuario.count({ where: { rol: "ADMINISTRADOR" } })).toBe(1);
  expect(await prisma.usuario.findUnique({ where: { email: "otro-admin@bookingapp.test" } })).toBeNull();
});

test("el registro público ignora un rol privilegiado", async ({ page }) => {
  for (const rol of ["ADMINISTRADOR", "PROFESOR"]) {
    const email = uniqueEmail(rol.toLowerCase());
    await submitRegister(page, email, PASSWORD, rol);
    await expect(page.getByText("Cuenta creada. Ya puedes iniciar sesión.")).toBeVisible();
    expect((await prisma.usuario.findUniqueOrThrow({ where: { email } })).rol).toBe("ESTUDIANTE");
  }
});

test("un usuario autenticado no cambia su propio rol", async ({ page }) => {
  const email = uniqueEmail("propio");
  await submitRegister(page, email, PASSWORD);
  await loginAs(page, email, PASSWORD);
  await page.goto("/admin/roles");
  await expect(page.locator("p[role='alert']")).toHaveText("No autorizado.");
  await expect(page.getByRole("button", { name: "Asignar rol" })).toHaveCount(0);
  expect((await prisma.usuario.findUniqueOrThrow({ where: { email } })).rol).toBe("ESTUDIANTE");

  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/admin/roles");
  await page.getByLabel("Correo del usuario").fill(ADMIN_EMAIL);
  await page.getByLabel("Rol").selectOption("ESTUDIANTE");
  await submitAssign(page);
  await expect(page.locator("p[role='alert']")).toHaveText("No puedes cambiar tu propio rol.");
  expect((await prisma.usuario.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } })).rol).toBe("ADMINISTRADOR");
});

test("el administrador asigna Profesor o Estudiante y no Administrador", async ({ page }) => {
  const email = uniqueEmail("destino");
  await submitRegister(page, email, PASSWORD);
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/admin/roles");

  await page.getByLabel("Correo del usuario").fill(email);
  await page.getByLabel("Rol").selectOption("PROFESOR");
  await submitAssign(page);
  await expect(page.getByText("Rol actualizado.")).toBeVisible();
  expect((await prisma.usuario.findUniqueOrThrow({ where: { email } })).rol).toBe("PROFESOR");

  await page.getByLabel("Correo del usuario").fill(email);
  await page.getByLabel("Rol").selectOption("ESTUDIANTE");
  await submitAssign(page);
  await expect(page.getByText("Rol actualizado.")).toBeVisible();
  expect((await prisma.usuario.findUniqueOrThrow({ where: { email } })).rol).toBe("ESTUDIANTE");

  await page.locator("select[name='rol']").evaluate((select) => {
    const option = document.createElement("option");
    option.value = "ADMINISTRADOR";
    option.textContent = "Administrador";
    select.appendChild(option);
  });
  await page.getByLabel("Correo del usuario").fill(email);
  await page.locator("select[name='rol']").selectOption("ADMINISTRADOR");
  await submitAssign(page);
  await expect(page.locator("p[role='alert']")).toHaveText("No se puede asignar el rol Administrador.");
  expect((await prisma.usuario.findUniqueOrThrow({ where: { email } })).rol).toBe("ESTUDIANTE");
});

test("el acceso a /admin/roles depende de la sesión y el rol", async ({ page, context, browser }) => {
  const email = uniqueEmail("intacto");
  await submitRegister(page, email, PASSWORD);
  expect((await prisma.usuario.findUniqueOrThrow({ where: { email } })).rol).toBe("ESTUDIANTE");

  await context.clearCookies();
  await page.goto("/admin/roles");
  await expect(page).toHaveURL(/\/ingreso$/);
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Asignar rol" })).toHaveCount(0);

  await loginAs(page, email, PASSWORD);
  await page.goto("/admin/roles");
  await expect(page.locator("p[role='alert']")).toHaveText("No autorizado.");
  await expect(page.getByRole("button", { name: "Asignar rol" })).toHaveCount(0);
  expect((await prisma.usuario.findUniqueOrThrow({ where: { email } })).rol).toBe("ESTUDIANTE");

  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/admin/roles");
  await expect(page.getByRole("button", { name: "Asignar rol" })).toBeVisible();
  await page.locator("select[name='rol']").evaluate((select) => {
    const option = document.createElement("option");
    option.value = "ADMINISTRADOR";
    option.textContent = "Administrador";
    select.appendChild(option);
  });
  await page.getByLabel("Correo del usuario").fill(email);
  await page.locator("select[name='rol']").selectOption("ADMINISTRADOR");
  const requestPromise = page.waitForRequest(
    (request) => request.method() === "POST" && request.url().includes("/admin/roles"),
  );
  await page.getByRole("button", { name: "Asignar rol" }).click();
  const source = await requestPromise;
  await expect(page.locator("p[role='alert']")).toHaveText("No se puede asignar el rol Administrador.");
  expect((await prisma.usuario.findUniqueOrThrow({ where: { email } })).rol).toBe("ESTUDIANTE");
  expect((await prisma.usuario.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } })).rol).toBe("ADMINISTRADOR");

  const anonymous = await browser.newContext();
  const anonymousResponse = await replayAssign(anonymous, source);
  expect(await anonymousResponse.text()).toContain("Debes iniciar sesión.");
  expect((await prisma.usuario.findUniqueOrThrow({ where: { email } })).rol).toBe("ESTUDIANTE");
  await anonymous.close();

  const student = await browser.newContext();
  const studentPage = await student.newPage();
  await loginAs(studentPage, email, PASSWORD);
  const studentResponse = await replayAssign(student, source);
  expect(await studentResponse.text()).toContain("No autorizado.");
  expect((await prisma.usuario.findUniqueOrThrow({ where: { email } })).rol).toBe("ESTUDIANTE");
  expect((await prisma.usuario.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } })).rol).toBe("ADMINISTRADOR");
  await student.close();
});
