import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { AttendanceService } from "./attendance.service";
import { attendanceHistoryQuerySchema, attendanceListQuerySchema } from "./attendance.validation";

export class AttendanceController {
  private attendanceService = new AttendanceService();

  checkIn = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const attendance = await this.attendanceService.checkIn(userId);
      res.status(201).json(attendance);
    } catch (error) {
      next(error);
    }
  };

  checkOut = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const attendance = await this.attendanceService.checkOut(userId);
      res.json(attendance);
    } catch (error) {
      next(error);
    }
  };

  getMyAttendance = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = attendanceHistoryQuerySchema.parse(req.query);
      const userId = req.user!.userId;

      const result = await this.attendanceService.getMyAttendance(userId, parsed);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getEmployeeAttendance = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = attendanceHistoryQuerySchema.parse(req.query);
      const companyId = req.user!.companyId;
      const employeeId = req.params.employeeId as string;

      const result = await this.attendanceService.getEmployeeAttendance(companyId, employeeId, parsed);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  listAttendance = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = attendanceListQuerySchema.parse(req.query);
      const companyId = req.user!.companyId;

      const result = await this.attendanceService.listAttendance(companyId, parsed);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
