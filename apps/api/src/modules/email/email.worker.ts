import { Worker, Job } from "bullmq";
import { EmailService } from "./email.service";
import { redisConnection } from "./email.queue";
import type { SendVerificationEmailJobData } from "./email.queue";

const emailService = new EmailService();

export function startEmailWorker() {
  const worker = new Worker(
    "emailQueue",
    async (job: Job<SendVerificationEmailJobData>) => {
      if (job.name === "sendVerificationEmail") {
        const { email, fullName, token } = job.data;
        await emailService.sendVerificationEmail(email, fullName, token);
      }
    },
    {
      connection: redisConnection as any,
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[Email Worker] Job ${job.id} completed successfully.`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Email Worker] Job ${job?.id} failed with error:`, err);
  });

  return worker;
}
