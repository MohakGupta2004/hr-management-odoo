import { Router } from "express";
import { AttendanceController } from "./attendance.controller";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

export const attendanceRouter = Router();
const attendanceController = new AttendanceController();

attendanceRouter.use(requireAuth);

// Self-service: any authenticated employee checks their own attendance in/out
attendanceRouter.post("/check-in", attendanceController.checkIn);
attendanceRouter.post("/check-out", attendanceController.checkOut);
attendanceRouter.get("/me", attendanceController.getMyAttendance);

// HR (Admin) views — must be registered after "/me" since both match a single path segment
attendanceRouter.get("/", requireRole(["ADMIN"]), attendanceController.listAttendance);
attendanceRouter.get("/:employeeId", requireRole(["ADMIN"]), attendanceController.getEmployeeAttendance);
