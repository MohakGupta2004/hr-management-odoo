import { z } from "zod";

export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "HALF_DAY", "LEAVE", "WEEKEND"] as const;

export const attendanceHistoryQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  month: z.string().regex(/^([1-9]|1[0-2])$/).transform(Number).optional(),
  year: z.string().regex(/^\d{4}$/).transform(Number).optional(),
});

export const attendanceListQuerySchema = attendanceHistoryQuerySchema.extend({
  employee: z.string().trim().optional(),
  department: z.string().trim().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format").optional(),
  status: z.enum(ATTENDANCE_STATUSES).optional(),
});

export type AttendanceHistoryQuery = z.infer<typeof attendanceHistoryQuerySchema>;
export type AttendanceListQuery = z.infer<typeof attendanceListQuerySchema>;
