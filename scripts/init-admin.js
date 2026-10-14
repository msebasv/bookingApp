const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "";

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const { hash } = await import("bcryptjs");

  if (!email || !email.includes("@") || password.length < 8) {
    console.error("ADMIN_EMAIL y ADMIN_PASSWORD son obligatorios. La contraseña debe tener al menos 8 caracteres.");
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.usuario.findFirst({
      where: { rol: "ADMINISTRADOR" },
    });
    if (existing) {
      console.log("Ya existe un administrador. No se creó otro.");
      return;
    }

    await prisma.usuario.create({
      data: {
        email,
        passwordHash: await hash(password, 12),
        rol: "ADMINISTRADOR",
      },
    });
    console.log("Administrador creado.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
