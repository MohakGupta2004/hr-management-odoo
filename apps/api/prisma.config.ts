import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations / db push use a direct (unpooled) connection when available.
    // PgBouncer transaction pooling (Neon's -pooler host) doesn't support the
    // advisory locks / DDL session state Prisma needs; DATABASE_URL is the fallback.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
});
