import { execSync } from "child_process";
import path from "path";

const schemaPath = path.join(__dirname, "../prisma/schema.prisma");

try {
  execSync(
    `npx prisma db push --schema "${schemaPath}" --skip-generate --accept-data-loss`,
    { stdio: "inherit", env: process.env }
  );
  console.log("Database ready.");
} catch (err) {
  console.error("Failed to set up database:", err);
  process.exit(1);
}
