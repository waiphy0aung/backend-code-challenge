import "dotenv/config";
import { createApp } from "./app";
import { disconnect } from "./db";

const PORT = Number(process.env.PORT ?? 3000);

const app = createApp();
const server = app.listen(PORT, () => {
  console.log(`Book API listening on http://localhost:${PORT}`);
})

async function shutdown(signal: string) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await disconnect();
    process.exit(0);
  })
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
