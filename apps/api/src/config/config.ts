import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  databaseUrl: process.env.DATABASE_URL || "",
  resendApiKey: process.env.RESEND_API_KEY || "",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  emailFrom: process.env.EMAIL_FROM || "onboarding@resend.dev",
};

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL must be defined");
}
