import { prisma } from "../../db/prisma";
import { BadRequestError, ConflictError, NotFoundError } from "../../utils/errors";
import { Prisma } from "../../../generated/prisma/client";
import type { AttendanceHistoryQuery, AttendanceListQuery } from "./attendance.validation";

const STANDARD_WORKDAY_MINUTES = 480;
const HALF_DAY_THRESHOLD_MINUTES = 240;

function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function formatTime(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().substring(11, 16);
}

function formatRecord(a: {
  id: string;
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  status: string;
  workingMinutes: number | null;
  overtimeMinutes: number | null;
}) {
  return {
    id: a.id,
    date: a.date.toISOString().substring(0, 10),
    checkIn: formatTime(a.checkIn),
    checkOut: formatTime(a.checkOut),
    status: a.status,
    workingMinutes: a.workingMinutes,
    overtimeMinutes: a.overtimeMinutes,
  };
}

export class AttendanceService {
  private async getEmployeeByUserId(userId: string) {
    const employee = await prisma.employee.findUnique({ where: { userId } });
    if (!employee) {
      throw new NotFoundError("Employee profile not found");
    }
    return employee;
  }

  async checkIn(userId: string) {
    const employee = await this.getEmployeeByUserId(userId);
    const today = toDateOnly(new Date());

    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: today } },
    });

    if (existing) {
      throw new ConflictError("Already checked in for today");
    }

    try {
      const attendance = await prisma.attendance.create({
        data: {
          employeeId: employee.id,
          date: today,
          checkIn: new Date(),
          status: "PRESENT",
        },
      });

      return formatRecord(attendance);
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("Already checked in for today");
      }
      throw error;
    }
  }

  async checkOut(userId: string) {
    const employee = await this.getEmployeeByUserId(userId);
    const today = toDateOnly(new Date());

    const attendance = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: today } },
    });

    if (!attendance || !attendance.checkIn) {
      throw new ConflictError("Cannot check out without checking in first");
    }

    if (attendance.checkOut) {
      throw new ConflictError("Already checked out for today");
    }

    const checkOutTime = new Date();
    const workingMinutes = Math.max(0, Math.round((checkOutTime.getTime() - attendance.checkIn.getTime()) / 60000));
    const overtimeMinutes = workingMinutes > STANDARD_WORKDAY_MINUTES ? workingMinutes - STANDARD_WORKDAY_MINUTES : 0;
    const status = workingMinutes < HALF_DAY_THRESHOLD_MINUTES ? "HALF_DAY" : "PRESENT";

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: checkOutTime,
        workingMinutes,
        overtimeMinutes,
        status,
      },
    });

    return formatRecord(updated);
  }

  private buildDateRange(params: { month?: number; year?: number }): Prisma.AttendanceWhereInput | undefined {
    if (!params.month && !params.year) return undefined;

    const year = params.year ?? new Date().getUTCFullYear();

    if (params.month) {
      const from = new Date(Date.UTC(year, params.month - 1, 1));
      const to = new Date(Date.UTC(year, params.month, 1));
      return { date: { gte: from, lt: to } };
    }

    const from = new Date(Date.UTC(year, 0, 1));
    const to = new Date(Date.UTC(year + 1, 0, 1));
    return { date: { gte: from, lt: to } };
  }

  private async getHistory(employeeId: string, params: AttendanceHistoryQuery) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AttendanceWhereInput = {
      employeeId,
      ...this.buildDateRange(params),
    };

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: "desc" },
      }),
      prisma.attendance.count({ where }),
    ]);

    return {
      records: records.map(formatRecord),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Marks a date range as LEAVE for an employee. This is the single entry point for
   * other bounded contexts (e.g. Leave) to write attendance rows — attendance logic
   * stays owned by this module. Must be called inside a transaction so it commits
   * atomically with the caller's own writes (balance decrement, request status, etc).
   *
   * Existing rows (e.g. an ABSENT day) are upserted to LEAVE, clearing any timings.
   */
  async markLeave(tx: Prisma.TransactionClient, employeeId: string, startDate: Date, endDate: Date) {
    const start = toDateOnly(startDate);
    const end = toDateOnly(endDate);

    for (let d = new Date(start); d.getTime() <= end.getTime(); d.setUTCDate(d.getUTCDate() + 1)) {
      const date = new Date(d);
      await tx.attendance.upsert({
        where: { employeeId_date: { employeeId, date } },
        create: {
          employeeId,
          date,
          status: "LEAVE",
        },
        update: {
          status: "LEAVE",
          checkIn: null,
          checkOut: null,
          workingMinutes: null,
          overtimeMinutes: null,
        },
      });
    }
  }

  async getMyAttendance(userId: string, params: AttendanceHistoryQuery) {
    const employee = await this.getEmployeeByUserId(userId);
    return this.getHistory(employee.id, params);
  }

  async getEmployeeAttendance(companyId: string, employeeId: string, params: AttendanceHistoryQuery) {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId } });
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }
    return this.getHistory(employee.id, params);
  }

  async listAttendance(companyId: string, params: AttendanceListQuery) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const employeeWhere: Prisma.EmployeeWhereInput = { companyId };
    if (params.department) {
      employeeWhere.department = params.department;
    }

    const where: Prisma.AttendanceWhereInput = {
      employee: employeeWhere,
    };

    if (params.employee) {
      where.employeeId = params.employee;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.date) {
      const parsed = new Date(params.date);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestError("Invalid date");
      }
      where.date = toDateOnly(parsed);
    }

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: "desc" },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, department: true },
          },
        },
      }),
      prisma.attendance.count({ where }),
    ]);

    return {
      data: records.map((r) => ({
        ...formatRecord(r),
        employee: {
          id: r.employee.id,
          name: `${r.employee.firstName} ${r.employee.lastName}`.trim(),
          department: r.employee.department,
        },
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
