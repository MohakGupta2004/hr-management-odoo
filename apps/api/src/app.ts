import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import { usersRouter } from "./modules/users/users.router";

const app = express();

app.use(cors());
app.use(express.json());

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && "status" in err && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }
  next(err);
});

app.use("/users", usersRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Endpoint not found" });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled Application Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
