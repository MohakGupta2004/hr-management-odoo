import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { LeaveService } from "./leave.service";
import {
  allocateLeaveSchema,
  applyLeaveSchema,
  leaveHistoryQuerySchema,
  listLeavesSchema,
  rejectLeaveSchema,
} from "./leave.validation";

export class LeaveController {
  private leaveService = new LeaveService();

  // ---- Employee self-service ----

  applyLeave = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = applyLeaveSchema.parse(req.body);
      const userId = req.user!.userId;

      const leave = await this.leaveService.applyLeave(userId, parsed);
      res.status(201).json(leave);
    } catch (error) {
      next(error);
    }
  };

  getMyLeaves = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = leaveHistoryQuerySchema.parse(req.query);
      const userId = req.user!.userId;

      const result = await this.leaveService.getMyLeaves(userId, parsed);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getMyAllocations = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const result = await this.leaveService.getMyAllocations(userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  // ---- Admin (HR) ----

  allocateLeave = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = allocateLeaveSchema.parse(req.body);
      const companyId = req.user!.companyId;

      const result = await this.leaveService.allocateLeave(companyId, parsed);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  getEmployeeAllocations = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      const employeeId = req.params.employeeId as string;

      const result = await this.leaveService.getEmployeeAllocations(companyId, employeeId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getPendingLeaves = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = listLeavesSchema.parse(req.query);
      const companyId = req.user!.companyId;

      const result = await this.leaveService.getPendingLeaves(companyId, parsed);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  listLeaves = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = listLeavesSchema.parse(req.query);
      const companyId = req.user!.companyId;

      const result = await this.leaveService.listLeaves(companyId, parsed);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  approveLeave = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      const adminUserId = req.user!.userId;
      const leaveId = req.params.id as string;

      const result = await this.leaveService.approveLeave(companyId, adminUserId, leaveId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  rejectLeave = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = rejectLeaveSchema.parse(req.body ?? {});
      const companyId = req.user!.companyId;
      const adminUserId = req.user!.userId;
      const leaveId = req.params.id as string;

      const result = await this.leaveService.rejectLeave(companyId, adminUserId, leaveId, parsed.reason);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
