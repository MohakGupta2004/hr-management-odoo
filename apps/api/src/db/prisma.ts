import { PrismaClient } from "../../generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "../config/config";

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  // Give a new connection time to establish — serverless Postgres (Neon) can
  // take several seconds to wake from idle before it accepts the connection.
  connectionTimeoutMillis: 15000,
  ssl: config.databaseUrl.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({
  adapter,
  // Defaults (maxWait 2s) are too tight for a cold serverless DB, causing P2028
  // "Unable to start a transaction in the given time" on the first call after idle.
  transactionOptions: {
    maxWait: 10000, // wait up to 10s to acquire a connection to begin the tx
    timeout: 20000, // allow the tx body up to 20s to complete
  },
});

export async function disconnectDb() {
  await prisma.$disconnect();
  await pool.end();
}
