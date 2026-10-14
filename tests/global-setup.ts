import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const databaseUrl = "file:./e2e.db";

export default function globalSetup() {
  const prismaDir = path.join(process.cwd(), "prisma");
  for (const name of ["e2e.db", "e2e.db-journal"]) {
    const file = path.join(prismaDir, name);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
    shell: true,
  });
}
