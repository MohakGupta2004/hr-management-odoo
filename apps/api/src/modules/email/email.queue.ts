import { Queue } from "bullmq";
import Redis from "ioredis";
import { config } from "../../config/config";

export const redisConnection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

export const emailQueue = new Queue("emailQueue", {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: { age: 24 * 3600 },
  },
});

export interface SendVerificationEmailJobData {
  email: string;
  fullName: string;
  token: string;
}

export interface SendWelcomeEmailJobData {
  email: string;
  fullName: string;
  loginId: string;
  temporaryPassword: string;
}

export async function addEmailToQueue(data: SendVerificationEmailJobData) {
  await emailQueue.add("sendVerificationEmail", data);
}

export async function addWelcomeEmailToQueue(data: SendWelcomeEmailJobData) {
  await emailQueue.add("sendWelcomeEmail", data);
}

export async function closeEmailQueue() {
  await emailQueue.close();
}
