# api

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```
apps/api/
├── src/
│   ├── config/
│   │   └── config.ts          # Handles Env variables & validations
│   ├── db/
│   │   └── prisma.ts          # Encapsulates Prisma & Postgres pool connection
│   ├── users/
│   │   ├── users.service.ts    # Model logic (data access & DB manipulation)
│   │   ├── users.controller.ts # Route controller (Express request & response validation)
│   │   └── users.router.ts     # Express router definition for the /users module
│   └── app.ts                 # Configures global middleware & registers routers
├── index.ts                   # Bootstraps the application & handles graceful shutdown
├── db.ts (DELETED)            # Removed legacy database connection file



This project was created using `bun init` in bun v1.3.11. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
