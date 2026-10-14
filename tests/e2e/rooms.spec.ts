import { execFileSync } from "node:child_process";
import { expect, test, type BrowserContext, type Locator, type Page, type Request } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL = "file:./e2e.db";

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
      DATABASE_URL: "file:./e2e.db",
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

function createForm(page: Page) {
  return page.locator("#crear-sala");
}

function roomArticle(page: Page, codigo: string) {
  return page.getByRole("article", { name: codigo });
}

async function fillRoom(
  scope: Page | Locator,
  values: { nombre: string; codigo: string; ubicacion: string; capacidad: string; descripcion?: string },
) {
  await scope.getByLabel("Nombre", { exact: true }).fill(values.nombre);
  await scope.getByLabel("Código", { exact: true }).fill(values.codigo);
  await scope.getByLabel("Ubicación", { exact: true }).fill(values.ubicacion);
  await scope.getByLabel("Capacidad", { exact: true }).fill(values.capacidad);
  await scope.getByLabel("Descripción", { exact: true }).fill(values.descripcion ?? "");
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

test("sin sesión /salas redirige al ingreso y el catálogo vacío no inventa salas", async ({ page }) => {
  await prisma.sala.deleteMany();
  await page.goto("/salas");
  await expect(page).toHaveURL(/\/ingreso$/);
  await expect(page.getByRole("link", { name: "Salas", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Crear sala" })).toHaveCount(0);

  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/salas");
  await expect(page.getByRole("heading", { name: "Salas", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Salas", exact: true })).toBeVisible();
  await expect(page.getByText("No hay salas registradas.")).toBeVisible();
});

test("el administrador crea una sala activa y acepta los máximos", async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/salas");

  await fillRoom(createForm(page), {
    nombre: "Sala Norte",
    codigo: "N-1",
    ubicacion: "Bloque A",
    capacidad: "12",
  });
  await createForm(page).getByRole("button", { name: "Crear sala" }).click();
  await expect(page.getByText("Sala creada.")).toBeVisible();
  const created = roomArticle(page, "N-1");
  await expect(created.getByRole("heading", { name: "Sala Norte" })).toBeVisible();
  await expect(created.getByText("Activa", { exact: true })).toBeVisible();
  await expect(created.getByText("Ubicación: Bloque A")).toBeVisible();
  await expect(created.getByText("Capacidad: 12")).toBeVisible();
  const stored = await prisma.sala.findUniqueOrThrow({ where: { codigo: "N-1" } });
  expect(stored.estado).toBe("ACTIVA");
  expect(stored.descripcion).toBeNull();
  expect(stored.codigoNormalizado).toBe("n-1");

  const nombre = "A".repeat(100);
  const codigo = "B".repeat(20);
  const ubicacion = "C".repeat(120);
  const descripcion = "D".repeat(500);
  await fillRoom(createForm(page), { nombre, codigo, ubicacion, capacidad: "1", descripcion });
  await createForm(page).getByRole("button", { name: "Crear sala" }).click();
  await expect(roomArticle(page, codigo).getByRole("heading", { name: nombre })).toBeVisible();
  const maxed = await prisma.sala.findUniqueOrThrow({ where: { codigo } });
  expect(maxed.ubicacion).toHaveLength(120);
  expect(maxed.descripcion).toHaveLength(500);
});

test("rechaza datos inválidos, límites y un código duplicado sin distinguir mayúsculas", async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/salas");
  const before = await prisma.sala.count();

  await fillRoom(createForm(page), { nombre: "   ", codigo: "VAL-1", ubicacion: "Centro", capacidad: "4" });
  await createForm(page).getByRole("button", { name: "Crear sala" }).click();
  await expect(createForm(page).locator("p[role='alert']")).toHaveText("El nombre es obligatorio.");

  await fillRoom(createForm(page), { nombre: "Valida", codigo: "   ", ubicacion: "Centro", capacidad: "4" });
  await createForm(page).getByRole("button", { name: "Crear sala" }).click();
  await expect(createForm(page).locator("p[role='alert']")).toHaveText("El código es obligatorio.");

  await fillRoom(createForm(page), { nombre: "Valida", codigo: "VAL-1", ubicacion: "   ", capacidad: "4" });
  await createForm(page).getByRole("button", { name: "Crear sala" }).click();
  await expect(createForm(page).locator("p[role='alert']")).toHaveText("La ubicación es obligatoria.");

  await createForm(page).locator("[name='capacidad']").evaluate((input) => input.removeAttribute("min"));
  await fillRoom(createForm(page), { nombre: "Valida", codigo: "VAL-1", ubicacion: "Centro", capacidad: "0" });
  await createForm(page).getByRole("button", { name: "Crear sala" }).click();
  await expect(createForm(page).locator("p[role='alert']")).toHaveText(
    "La capacidad debe ser un entero mayor o igual que 1.",
  );

  await createForm(page).locator("[name='nombre']").evaluate((input) => input.removeAttribute("maxlength"));
  await fillRoom(createForm(page), {
    nombre: "N".repeat(101),
    codigo: "LARGO-N",
    ubicacion: "Centro",
    capacidad: "2",
  });
  await createForm(page).getByRole("button", { name: "Crear sala" }).click();
  await expect(createForm(page).locator("p[role='alert']")).toHaveText(
    "El nombre admite como máximo 100 caracteres.",
  );

  await createForm(page).locator("[name='codigo']").evaluate((input) => input.removeAttribute("maxlength"));
  await fillRoom(createForm(page), {
    nombre: "Valida",
    codigo: "C".repeat(21),
    ubicacion: "Centro",
    capacidad: "2",
  });
  await createForm(page).getByRole("button", { name: "Crear sala" }).click();
  await expect(createForm(page).locator("p[role='alert']")).toHaveText(
    "El código admite como máximo 20 caracteres.",
  );

  await createForm(page).locator("[name='ubicacion']").evaluate((input) => input.removeAttribute("maxlength"));
  await fillRoom(createForm(page), {
    nombre: "Valida",
    codigo: "LARGO-U",
    ubicacion: "U".repeat(121),
    capacidad: "2",
  });
  await createForm(page).getByRole("button", { name: "Crear sala" }).click();
  await expect(createForm(page).locator("p[role='alert']")).toHaveText(
    "La ubicación admite como máximo 120 caracteres.",
  );

  await createForm(page).locator("[name='descripcion']").evaluate((input) => input.removeAttribute("maxlength"));
  await fillRoom(createForm(page), {
    nombre: "Valida",
    codigo: "LARGO-D",
    ubicacion: "Centro",
    capacidad: "2",
    descripcion: "D".repeat(501),
  });
  await createForm(page).getByRole("button", { name: "Crear sala" }).click();
  await expect(createForm(page).locator("p[role='alert']")).toHaveText(
    "La descripción admite como máximo 500 caracteres.",
  );

  await fillRoom(createForm(page), { nombre: "n-1", codigo: "n-1", ubicacion: "Otro", capacidad: "3" });
  await createForm(page).getByRole("button", { name: "Crear sala" }).click();
  await expect(createForm(page).locator("p[role='alert']")).toHaveText("Ese código ya está registrado.");
  expect(await prisma.sala.count({ where: { codigoNormalizado: "n-1" } })).toBe(1);
  expect(await prisma.sala.count()).toBe(before);

  const requestPromise = page.waitForRequest(
    (request) => request.method() === "POST" && request.url().includes("/salas"),
  );
  await fillRoom(createForm(page), {
    nombre: "Bypass",
    codigo: "BYP-1",
    ubicacion: "Centro",
    capacidad: "5",
  });
  await createForm(page).getByRole("button", { name: "Crear sala" }).click();
  const source = await requestPromise;
  await expect(page.getByText("Sala creada.")).toBeVisible();
  const rawBody = source.postDataBuffer() ?? Buffer.alloc(0);
  const invalid = replaceFormField(rawBody, "nombre", "   ");
  expect(invalid).not.toBeNull();
  const bypass = await replayAction(page.context(), source, invalid ?? undefined);
  expect(await bypass.text()).toContain("El nombre es obligatorio.");
  expect(await prisma.sala.count({ where: { codigo: "BYP-1" } })).toBe(1);
  await prisma.sala.delete({ where: { codigo: "BYP-1" } });
  expect(await prisma.sala.count()).toBe(before);
});

test("el índice único rechaza dos altas concurrentes del mismo código", async () => {
  const base = {
    nombre: "Carrera",
    ubicacion: "Laboratorio",
    capacidad: 2,
    estado: "ACTIVA",
    descripcion: null,
  };
  const results = await Promise.allSettled([
    prisma.sala.create({ data: { ...base, codigo: "Race", codigoNormalizado: "race" } }),
    prisma.sala.create({ data: { ...base, codigo: "RACE", codigoNormalizado: "race" } }),
  ]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(await prisma.sala.count({ where: { codigoNormalizado: "race" } })).toBe(1);
  await prisma.sala.deleteMany({ where: { codigoNormalizado: "race" } });
});

test("editar cambia los datos y no el estado", async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/salas");
  const article = roomArticle(page, "N-1");
  await article.locator("form").first().evaluate((form) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "estado";
    input.value = "INACTIVA";
    form.appendChild(input);
  });
  await fillRoom(article, {
    nombre: "Sala Norte editada",
    codigo: "N-1",
    ubicacion: "Bloque B",
    capacidad: "8",
    descripcion: "Ventanas",
  });
  await article.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(article.getByText("Sala actualizada.")).toBeVisible();
  await expect(article.getByRole("heading", { name: "Sala Norte editada" })).toBeVisible();
  await expect(article.getByText("Activa", { exact: true })).toBeVisible();
  let stored = await prisma.sala.findFirstOrThrow({ where: { codigoNormalizado: "n-1" } });
  expect(stored.estado).toBe("ACTIVA");
  expect(stored.descripcion).toBe("Ventanas");

  await fillRoom(article, {
    nombre: "Sala Norte editada",
    codigo: "N-1",
    ubicacion: "Bloque B",
    capacidad: "8",
    descripcion: "   ",
  });
  await article.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(article.getByText("Sala actualizada.")).toBeVisible();
  stored = await prisma.sala.findFirstOrThrow({ where: { codigoNormalizado: "n-1" } });
  expect(stored.descripcion).toBeNull();

  await fillRoom(article, {
    nombre: "Sala Norte editada",
    codigo: "B".repeat(20),
    ubicacion: "Bloque B",
    capacidad: "8",
  });
  await article.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(article.locator("p[role='alert']")).toHaveText("Ese código ya está registrado.");
  expect(await prisma.sala.count({ where: { codigoNormalizado: "n-1" } })).toBe(1);
});

test("activar y desactivar conserva la sala y el listado depende del rol", async ({ page }) => {
  const studentEmail = uniqueEmail("estudiante");
  const professorEmail = uniqueEmail("profesor");
  await register(page, studentEmail);
  await register(page, professorEmail);
  await prisma.usuario.update({ where: { email: professorEmail }, data: { rol: "PROFESOR" } });

  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/salas");
  const article = roomArticle(page, "N-1");
  await article.getByRole("button", { name: "Desactivar" }).click();
  await expect(article.getByText("Sala desactivada.")).toBeVisible();
  await expect(article.getByText("Inactiva", { exact: true })).toBeVisible();
  const inactive = await prisma.sala.findFirstOrThrow({ where: { codigoNormalizado: "n-1" } });
  expect(inactive.estado).toBe("INACTIVA");

  const names = page.getByRole("article").locator("h2");
  const ordered = await names.allTextContents();
  const maxName = "A".repeat(100);
  expect(ordered.indexOf(maxName)).toBeGreaterThanOrEqual(0);
  expect(ordered.indexOf(maxName)).toBeLessThan(ordered.indexOf("Sala Norte editada"));

  await loginAs(page, studentEmail, PASSWORD);
  await page.goto("/salas");
  await expect(roomArticle(page, "N-1")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Crear sala" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Guardar cambios" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Desactivar" })).toHaveCount(0);
  await expect(roomArticle(page, "B".repeat(20))).toBeVisible();

  await loginAs(page, professorEmail, PASSWORD);
  await page.goto("/salas");
  await expect(roomArticle(page, "N-1")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Activar" })).toHaveCount(0);

  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/salas");
  await roomArticle(page, "N-1").getByRole("button", { name: "Activar" }).click();
  await expect(roomArticle(page, "N-1").getByText("Sala activada.")).toBeVisible();
  await expect(roomArticle(page, "N-1").getByText("Activa", { exact: true })).toBeVisible();
  expect(await prisma.sala.findFirst({ where: { codigoNormalizado: "n-1" } })).not.toBeNull();

  await loginAs(page, studentEmail, PASSWORD);
  await page.goto("/salas");
  await expect(roomArticle(page, "N-1")).toBeVisible();
});

test("las escrituras sin permiso no modifican salas", async ({ page, context, browser }) => {
  const studentEmail = uniqueEmail("lectura");
  await register(page, studentEmail);
  const before = await prisma.sala.count();

  await context.clearCookies();
  await page.goto("/salas");
  await expect(page).toHaveURL(/\/ingreso$/);

  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/salas");
  const requestPromise = page.waitForRequest(
    (request) => request.method() === "POST" && request.url().includes("/salas"),
  );
  await createForm(page).evaluate((form) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "rol";
    input.value = "ADMINISTRADOR";
    form.appendChild(input);
  });
  await fillRoom(createForm(page), {
    nombre: "Sala auditada",
    codigo: "AUD-1",
    ubicacion: "Auditorio",
    capacidad: "40",
  });
  await createForm(page).getByRole("button", { name: "Crear sala" }).click();
  const source = await requestPromise;
  await expect(page.getByText("Sala creada.")).toBeVisible();

  const anonymous = await browser.newContext();
  const anonymousResponse = await replayAction(anonymous, source);
  expect(await anonymousResponse.text()).toContain("Debes iniciar sesión.");
  await anonymous.close();

  const student = await browser.newContext();
  const studentPage = await student.newPage();
  await loginAs(studentPage, studentEmail, PASSWORD);
  const studentResponse = await replayAction(student, source);
  expect(await studentResponse.text()).toContain("No autorizado.");
  await student.close();

  await prisma.usuario.update({ where: { email: studentEmail }, data: { rol: "PROFESOR" } });
  const professor = await browser.newContext();
  const professorPage = await professor.newPage();
  await loginAs(professorPage, studentEmail, PASSWORD);
  const professorResponse = await replayAction(professor, source);
  expect(await professorResponse.text()).toContain("No autorizado.");
  await professor.close();

  expect(await prisma.sala.count({ where: { codigoNormalizado: "aud-1" } })).toBe(1);
  expect(await prisma.sala.count()).toBe(before + 1);
});
