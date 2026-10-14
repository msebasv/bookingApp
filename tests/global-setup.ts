import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const databaseUrl = process.env.BOOKINGAPP_E2E_DATABASE_URL ?? "file:./e2e.db";

function resetDatabase() {
  const override = process.env.BOOKINGAPP_E2E_DATABASE_URL;
  if (!override) {
    const prismaDir = path.join(process.cwd(), "prisma");
    for (const name of ["e2e.db", "e2e.db-journal"]) {
      const file = path.join(prismaDir, name);
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }
    return;
  }

  const decoded = decodeURIComponent(override.replace(/^file:/, ""));
  const resolved = path.resolve(decoded);
  const prismaDir = path.resolve(process.cwd(), "prisma");
  if (resolved === prismaDir || resolved.startsWith(prismaDir + path.sep)) {
    throw new Error(`Refusing to reset a database inside prisma: ${resolved}`);
  }
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const candidate = resolved + suffix;
    if (fs.existsSync(candidate)) {
      fs.unlinkSync(candidate);
    }
  }
}

export default function globalSetup() {
  resetDatabase();

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
    shell: true,
  });
}
