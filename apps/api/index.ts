import app from "./src/app";
import { config } from "./src/config/config";
import { disconnectDb } from "./src/db/prisma";

const server = app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});

async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Shutting down...`);
  server.close(async () => {
    try {
      await disconnectDb();
      process.exit(0);
    } catch (dbError) {
      process.exit(1);
    }
  });

  setTimeout(() => {
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
