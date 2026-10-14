import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
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
    env: { ...process.env, DATABASE_URL: databaseUrl, ADMIN_EMAIL, ADMIN_PASSWORD },
  });
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@bookingapp.test`;
}

function nav(page: Page) {
  return page.getByRole("navigation", { name: "Principal" });
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

async function expectPublicNav(page: Page) {
  const menu = nav(page);
  await expect(menu.getByRole("link", { name: "Inicio", exact: true })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Ingresar", exact: true })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Crear cuenta", exact: true })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Salas", exact: true })).toHaveCount(0);
  await expect(menu.getByRole("link", { name: "Reservas", exact: true })).toHaveCount(0);
  await expect(menu.getByRole("link", { name: "Mi cuenta", exact: true })).toHaveCount(0);
  await expect(menu.getByRole("link", { name: "Roles", exact: true })).toHaveCount(0);
  await expect(menu.getByRole("button", { name: "Cerrar sesión" })).toHaveCount(0);
}

async function expectMemberNav(page: Page, email: string, admin: boolean) {
  const menu = nav(page);
  await expect(menu.getByRole("link", { name: "Inicio", exact: true })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Salas", exact: true })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Reservas", exact: true })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Mi cuenta", exact: true })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
  await expect(menu.getByText(email)).toBeVisible();
  await expect(menu.getByRole("link", { name: "Ingresar", exact: true })).toHaveCount(0);
  await expect(menu.getByRole("link", { name: "Crear cuenta", exact: true })).toHaveCount(0);
  await expect(menu.getByRole("link", { name: "Roles", exact: true })).toHaveCount(admin ? 1 : 0);
}

test("un visitante solo ve el menú público y las rutas protegidas siguen pidiendo sesión", async ({ page }) => {
  await page.context().clearCookies();
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  await expectPublicNav(page);
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "Consulta espacios de estudio y resérvalos" })).toBeVisible();
  await expect(main.getByText("Salas", { exact: true })).toBeVisible();
  await expect(main.getByText("Horarios", { exact: true })).toBeVisible();
  await expect(main.getByText("Reservas", { exact: true })).toBeVisible();
  await expect(main.getByRole("link", { name: "Ingresar", exact: true })).toBeVisible();
  await expect(main.getByRole("link", { name: "Crear cuenta", exact: true })).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/salas");
  await expect(page).toHaveURL(/\/ingreso$/);
  await expect(page.getByRole("button", { name: "Crear sala" })).toHaveCount(0);
  await expectPublicNav(page);

  await page.goto("/reservas");
  await expect(page).toHaveURL(/\/ingreso$/);
  await expect(page.getByRole("button", { name: "Confirmar reserva" })).toHaveCount(0);

  await page.goto("/admin/roles");
  await expect(page).toHaveURL(/\/ingreso$/);
  await expect(page.getByRole("button", { name: "Asignar rol" })).toHaveCount(0);
});

test("estudiante, profesor y administrador ven su menú y la portada de su rol", async ({ page }) => {
  const student = uniqueEmail("nav-est");
  const professor = uniqueEmail("nav-pro");
  await register(page, student);
  await register(page, professor);
  await prisma.usuario.update({ where: { email: professor }, data: { rol: "PROFESOR" } });

  await loginAs(page, student, PASSWORD);
  await expectMemberNav(page, student, false);
  await page.goto("/");
  const studentMain = page.getByRole("main");
  await expect(studentMain.getByRole("link", { name: "Ingresar", exact: true })).toHaveCount(0);
  await expect(studentMain.getByRole("link", { name: "Crear cuenta", exact: true })).toHaveCount(0);
  await expect(studentMain.getByRole("link", { name: /^Salas/ })).toBeVisible();
  await expect(studentMain.getByRole("link", { name: /^Reservas/ })).toBeVisible();
  await expect(studentMain.getByRole("link", { name: /^Mi cuenta/ })).toBeVisible();
  await expect(studentMain.getByRole("link", { name: /^Roles/ })).toHaveCount(0);
  await page.goto("/?rol=ADMINISTRADOR");
  await expect(nav(page).getByRole("link", { name: "Roles", exact: true })).toHaveCount(0);

  await loginAs(page, professor, PASSWORD);
  await expectMemberNav(page, professor, false);
  await page.goto("/");
  await expect(page.getByRole("main").getByRole("link", { name: /^Roles/ })).toHaveCount(0);

  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await expectMemberNav(page, ADMIN_EMAIL, true);
  await page.goto("/");
  await expect(page.getByRole("main").getByRole("link", { name: /^Roles/ })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Ingresar", exact: true })).toHaveCount(0);

  await nav(page).getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
  await expectPublicNav(page);
});
