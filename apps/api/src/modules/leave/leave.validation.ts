import { z } from "zod";

export const LEAVE_TYPES = ["PAID", "SICK", "CASUAL"] as const;
export const LEAVE_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

export type LeaveTypeValue = (typeof LEAVE_TYPES)[number];

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const applyLeaveSchema = z.object({
  leaveType: z.enum(LEAVE_TYPES),
  startDate: dateString,
  endDate: dateString,
  reason: z.string().trim().min(1, "Reason is required"),
});

export const allocateLeaveSchema = z.object({
  employeeId: z.string().trim().min(1, "employeeId is required"),
  leaveType: z.enum(LEAVE_TYPES),
  totalDays: z.number().int().positive("totalDays must be a positive integer"),
  year: z.number().int().gte(2000).lte(2100).optional(),
});

export const rejectLeaveSchema = z.object({
  reason: z.string().trim().min(1).optional(),
});

export const listLeavesSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  status: z.enum(LEAVE_STATUSES).optional(),
  employee: z.string().trim().optional(),
  leaveType: z.enum(LEAVE_TYPES).optional(),
});

export const leaveHistoryQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  status: z.enum(LEAVE_STATUSES).optional(),
});

export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>;
export type AllocateLeaveInput = z.infer<typeof allocateLeaveSchema>;
export type ListLeavesQuery = z.infer<typeof listLeavesSchema>;
export type LeaveHistoryQuery = z.infer<typeof leaveHistoryQuerySchema>;
