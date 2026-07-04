import app from "./src/app";
import { config } from "./src/config/config";
import { disconnectDb } from "./src/db/prisma";
import { startEmailWorker } from "./src/modules/email/email.worker";
import { closeEmailQueue, redisConnection } from "./src/modules/email/email.queue";
const emailWorker = startEmailWorker();
const server = app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});

async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Shutting down...`);
  server.close(async () => {
    try {
      await emailWorker.close();
      await closeEmailQueue();
      await redisConnection.quit();
      await disconnectDb();
      process.exit(0);
    } catch (error) {
      console.error("Error during graceful shutdown:", error);
      process.exit(1);
    }
  });

  setTimeout(() => {
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
