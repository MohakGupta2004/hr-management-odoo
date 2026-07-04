import { Router } from "express";
import { AttendanceController } from "./attendance.controller";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

export const attendanceRouter = Router();
const attendanceController = new AttendanceController();

attendanceRouter.use(requireAuth);

// Self-service
attendanceRouter.post("/check-in", attendanceController.checkIn);
attendanceRouter.post("/check-out", attendanceController.checkOut);
attendanceRouter.get("/me", attendanceController.getMyAttendance);

// Admin views ("/me" must stay above "/:employeeId")
attendanceRouter.get("/", requireRole(["ADMIN"]), attendanceController.listAttendance);
attendanceRouter.get("/:employeeId", requireRole(["ADMIN"]), attendanceController.getEmployeeAttendance);
