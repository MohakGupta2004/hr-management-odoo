import { PrismaClient } from "../../generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "../config/config";

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

export async function disconnectDb() {
  await prisma.$disconnect();
  await pool.end();
}
