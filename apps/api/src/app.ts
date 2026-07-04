import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { usersRouter } from "./modules/users/users.router";
import { authRouter } from "./modules/auth/auth.route";
import { employeeRouter } from "./modules/employee/employee.route";
import { attendanceRouter } from "./modules/attendance/attendance.routes";
import { leaveRouter } from "./modules/leave/leave.routes";
import {
  salaryStructureRouter,
  salaryComponentRouter,
  payrollRouter,
  payslipRouter,
} from "./modules/payroll/payroll.routes";

import { ZodError } from "zod";
import { AppError } from "./utils/errors";

const app = express();

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && "status" in err && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }
  next(err);
});

app.use("/users", usersRouter);
app.use("/auth", authRouter);
app.use("/employees", employeeRouter);
app.use("/attendance", attendanceRouter);
app.use("/leaves", leaveRouter);
app.use("/salary-structures", salaryStructureRouter);
app.use("/salary-components", salaryComponentRouter);
app.use("/payroll", payrollRouter);
app.use("/payslips", payslipRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Endpoint not found" });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  if (err instanceof ZodError) {
    const message = err.issues[0]?.message || "Validation failed";
    return res.status(400).json({ error: message });
  }
  console.error("Unhandled Application Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
