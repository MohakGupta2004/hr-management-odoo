import { Worker, Job } from "bullmq";
import { EmailService } from "./email.service";
import { redisConnection } from "./email.queue";
import type {
  SendVerificationEmailJobData,
  SendWelcomeEmailJobData,
  SendLeaveRequestedEmailJobData,
  SendLeaveDecisionEmailJobData,
} from "./email.queue";

const emailService = new EmailService();

type EmailJobData =
  | SendVerificationEmailJobData
  | SendWelcomeEmailJobData
  | SendLeaveRequestedEmailJobData
  | SendLeaveDecisionEmailJobData;

export function startEmailWorker() {
  const worker = new Worker(
    "emailQueue",
    async (job: Job<EmailJobData>) => {
      if (job.name === "sendVerificationEmail") {
        const data = job.data as SendVerificationEmailJobData;
        await emailService.sendVerificationEmail(data.email, data.fullName, data.token);
      } else if (job.name === "sendWelcomeEmail") {
        const data = job.data as SendWelcomeEmailJobData;
        await emailService.sendWelcomeEmail(data.email, data.fullName, data.loginId, data.temporaryPassword);
      } else if (job.name === "sendLeaveRequestedEmail") {
        const data = job.data as SendLeaveRequestedEmailJobData;
        await emailService.sendLeaveRequestedEmail(data);
      } else if (job.name === "sendLeaveDecisionEmail") {
        const data = job.data as SendLeaveDecisionEmailJobData;
        await emailService.sendLeaveDecisionEmail(data);
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
