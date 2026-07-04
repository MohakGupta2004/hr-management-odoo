import { prisma } from "../../db/prisma";
import { Prisma } from "../../../generated/prisma/client";
import { BadRequestError, ConflictError, NotFoundError } from "../../utils/errors";
import { AttendanceService } from "../attendance/attendance.service";
import {
  addLeaveRequestedEmailToQueue,
  addLeaveDecisionEmailToQueue,
} from "../email/email.queue";
import type {
  AllocateLeaveInput,
  ApplyLeaveInput,
  LeaveHistoryQuery,
  ListLeavesQuery,
} from "./leave.validation";

/** Parse a YYYY-MM-DD string into a UTC date-only instant (no timezone drift). */
function parseDateOnly(input: string): Date {
  const [y, m, d] = input.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

function todayDateOnly(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

/** Inclusive whole-day count. Jul-10 -> Jul-12 = 3. */
function countInclusiveDays(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

function fmtDate(d: Date): string {
  return d.toISOString().substring(0, 10);
}

function formatAllocation(a: {
  id: string;
  leaveType: string;
  year: number;
  totalDays: number;
  usedDays: number;
}) {
  return {
    id: a.id,
    leaveType: a.leaveType,
    year: a.year,
    totalDays: a.totalDays,
    usedDays: a.usedDays,
    remainingDays: a.totalDays - a.usedDays,
  };
}

interface LeaveRow {
  id: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  status: string;
  approvedAt: Date | null;
  decisionReason: string | null;
  createdAt: Date;
}

function formatLeave(lr: LeaveRow) {
  return {
    id: lr.id,
    leaveType: lr.leaveType,
    startDate: fmtDate(lr.startDate),
    endDate: fmtDate(lr.endDate),
    days: lr.days,
    reason: lr.reason,
    status: lr.status,
    approvedAt: lr.approvedAt ? lr.approvedAt.toISOString() : null,
    decisionReason: lr.decisionReason,
    createdAt: lr.createdAt.toISOString(),
  };
}

export class LeaveService {
  private attendanceService = new AttendanceService();

  private async getEmployeeByUserId(userId: string) {
    const employee = await prisma.employee.findUnique({
      where: { userId },
      include: { user: { select: { email: true } } },
    });
    if (!employee) {
      throw new NotFoundError("Employee profile not found");
    }
    return employee;
  }

  // ---- Allocations -----------------------------------------------------------

  async allocateLeave(companyId: string, data: AllocateLeaveInput) {
    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, companyId },
    });
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    const year = data.year ?? new Date().getUTCFullYear();

    const existing = await prisma.leaveAllocation.findUnique({
      where: {
        employeeId_leaveType_year: {
          employeeId: data.employeeId,
          leaveType: data.leaveType,
          year,
        },
      },
    });

    if (existing) {
      if (data.totalDays < existing.usedDays) {
        throw new BadRequestError(
          `totalDays (${data.totalDays}) cannot be less than days already used (${existing.usedDays})`
        );
      }
      const updated = await prisma.leaveAllocation.update({
        where: { id: existing.id },
        data: { totalDays: data.totalDays },
      });
      return formatAllocation(updated);
    }

    const created = await prisma.leaveAllocation.create({
      data: {
        employeeId: data.employeeId,
        leaveType: data.leaveType,
        year,
        totalDays: data.totalDays,
        usedDays: 0,
      },
    });
    return formatAllocation(created);
  }

  async getMyAllocations(userId: string) {
    const employee = await this.getEmployeeByUserId(userId);
    return this.getAllocationsForEmployee(employee.id);
  }

  async getEmployeeAllocations(companyId: string, employeeId: string) {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId } });
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }
    return this.getAllocationsForEmployee(employeeId);
  }

  private async getAllocationsForEmployee(employeeId: string) {
    const allocations = await prisma.leaveAllocation.findMany({
      where: { employeeId },
      orderBy: [{ year: "desc" }, { leaveType: "asc" }],
    });
    return allocations.map(formatAllocation);
  }

  // ---- Requests --------------------------------------------------------------

  async applyLeave(userId: string, input: ApplyLeaveInput) {
    const employee = await this.getEmployeeByUserId(userId);

    const start = parseDateOnly(input.startDate);
    const end = parseDateOnly(input.endDate);

    // Rule 1: start must not be after end
    if (start.getTime() > end.getTime()) {
      throw new BadRequestError("startDate cannot be after endDate");
    }

    // Rule 2: cannot apply for a past date
    if (start.getTime() < todayDateOnly().getTime()) {
      throw new BadRequestError("Cannot apply for leave on a past date");
    }

    const days = countInclusiveDays(start, end);

    // Rule 3: no overlapping pending/approved leave
    const overlap = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: employee.id,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });
    if (overlap) {
      throw new ConflictError("You already have a leave request overlapping these dates");
    }

    // Rule 4: sufficient balance (checked, but NOT deducted until approval)
    const year = start.getUTCFullYear();
    const allocation = await prisma.leaveAllocation.findUnique({
      where: {
        employeeId_leaveType_year: { employeeId: employee.id, leaveType: input.leaveType, year },
      },
    });
    if (!allocation) {
      throw new BadRequestError(
        `No ${input.leaveType} leave allocation found for ${year}. Please contact HR.`
      );
    }
    const remaining = allocation.totalDays - allocation.usedDays;
    if (days > remaining) {
      throw new BadRequestError(
        `Insufficient ${input.leaveType} balance: requested ${days} day(s), only ${remaining} remaining`
      );
    }

    const created = await prisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveType: input.leaveType,
        startDate: start,
        endDate: end,
        days,
        reason: input.reason,
        status: "PENDING",
      },
    });

    // Fire-and-forget notification to admins via Redis queue (never blocks the request)
    this.notifyAdminsOfRequest(employee, created).catch((err) =>
      console.error("[LeaveService] Failed to enqueue leave-requested notification:", err)
    );

    return formatLeave(created);
  }

  async getMyLeaves(userId: string, params: LeaveHistoryQuery) {
    const employee = await this.getEmployeeByUserId(userId);
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.LeaveRequestWhereInput = { employeeId: employee.id };
    if (params.status) where.status = params.status;

    const [records, total] = await Promise.all([
      prisma.leaveRequest.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.leaveRequest.count({ where }),
    ]);

    return {
      records: records.map(formatLeave),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPendingLeaves(companyId: string, params: ListLeavesQuery) {
    return this.listLeaves(companyId, { ...params, status: "PENDING" });
  }

  async listLeaves(companyId: string, params: ListLeavesQuery) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.LeaveRequestWhereInput = { employee: { companyId } };
    if (params.status) where.status = params.status;
    if (params.employee) where.employeeId = params.employee;
    if (params.leaveType) where.leaveType = params.leaveType;

    const [records, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, department: true } },
        },
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    return {
      data: records.map((r) => ({
        ...formatLeave(r),
        employee: {
          id: r.employee.id,
          name: `${r.employee.firstName} ${r.employee.lastName}`.trim(),
          department: r.employee.department,
        },
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async approveLeave(companyId: string, adminUserId: string, leaveId: string) {
    const approver = await this.getEmployeeByUserId(adminUserId);

    const leave = await prisma.leaveRequest.findFirst({
      where: { id: leaveId, employee: { companyId } },
      include: { employee: { include: { user: { select: { email: true } } } } },
    });
    if (!leave) {
      throw new NotFoundError("Leave request not found");
    }
    // Rule 5: cannot approve a request that is not pending
    if (leave.status !== "PENDING") {
      throw new ConflictError(`Leave request is already ${leave.status}`);
    }

    const year = leave.startDate.getUTCFullYear();

    // One atomic transaction: request status + balance + attendance rows.
    await prisma.$transaction(async (tx) => {
      // Atomic guard against a concurrent double-approve (Rule 5)
      const updated = await tx.leaveRequest.updateMany({
        where: { id: leaveId, status: "PENDING" },
        data: { status: "APPROVED", approvedById: approver.id, approvedAt: new Date() },
      });
      if (updated.count === 0) {
        throw new ConflictError("Leave request has already been processed");
      }

      // Re-check + decrement balance (Rule 4)
      const allocation = await tx.leaveAllocation.findUnique({
        where: {
          employeeId_leaveType_year: {
            employeeId: leave.employeeId,
            leaveType: leave.leaveType,
            year,
          },
        },
      });
      if (!allocation) {
        throw new BadRequestError("Leave allocation not found for this request");
      }
      if (allocation.totalDays - allocation.usedDays < leave.days) {
        throw new BadRequestError("Insufficient balance to approve this leave");
      }
      await tx.leaveAllocation.update({
        where: { id: allocation.id },
        data: { usedDays: { increment: leave.days } },
      });

      // Rule 7: attendance is auto-marked LEAVE. Attendance module owns this write.
      await this.attendanceService.markLeave(tx, leave.employeeId, leave.startDate, leave.endDate);
    });

    this.notifyDecision(leave, "APPROVED").catch((err) =>
      console.error("[LeaveService] Failed to enqueue leave-approved notification:", err)
    );

    const fresh = await prisma.leaveRequest.findUniqueOrThrow({ where: { id: leaveId } });
    return formatLeave(fresh);
  }

  async rejectLeave(companyId: string, adminUserId: string, leaveId: string, reason?: string) {
    const approver = await this.getEmployeeByUserId(adminUserId);

    const leave = await prisma.leaveRequest.findFirst({
      where: { id: leaveId, employee: { companyId } },
      include: { employee: { include: { user: { select: { email: true } } } } },
    });
    if (!leave) {
      throw new NotFoundError("Leave request not found");
    }
    if (leave.status !== "PENDING") {
      throw new ConflictError(`Leave request is already ${leave.status}`);
    }

    // Rejection touches only the request — no balance change, no attendance rows.
    const updated = await prisma.leaveRequest.updateMany({
      where: { id: leaveId, status: "PENDING" },
      data: {
        status: "REJECTED",
        approvedById: approver.id,
        approvedAt: new Date(),
        decisionReason: reason ?? null,
      },
    });
    if (updated.count === 0) {
      throw new ConflictError("Leave request has already been processed");
    }

    this.notifyDecision(leave, "REJECTED", reason).catch((err) =>
      console.error("[LeaveService] Failed to enqueue leave-rejected notification:", err)
    );

    const fresh = await prisma.leaveRequest.findUniqueOrThrow({ where: { id: leaveId } });
    return formatLeave(fresh);
  }

  // ---- Notifications (Redis queue) ------------------------------------------

  private async notifyAdminsOfRequest(
    employee: { id: string; userId: string; companyId: string; firstName: string; lastName: string },
    leave: LeaveRow
  ) {
    const admins = await prisma.user.findMany({
      where: {
        companyId: employee.companyId,
        role: "ADMIN",
        isActive: true,
        id: { not: employee.userId },
      },
      include: { employee: { select: { firstName: true } } },
    });

    const employeeName = `${employee.firstName} ${employee.lastName}`.trim();

    for (const admin of admins) {
      await addLeaveRequestedEmailToQueue({
        to: admin.email,
        adminName: admin.employee?.firstName ?? "Admin",
        employeeName,
        leaveType: leave.leaveType,
        startDate: fmtDate(leave.startDate),
        endDate: fmtDate(leave.endDate),
        days: leave.days,
        reason: leave.reason,
      });
    }
  }

  private async notifyDecision(
    leave: LeaveRow & { employee: { firstName: string; lastName: string; user: { email: string } } },
    status: "APPROVED" | "REJECTED",
    reason?: string
  ) {
    await addLeaveDecisionEmailToQueue({
      to: leave.employee.user.email,
      employeeName: `${leave.employee.firstName} ${leave.employee.lastName}`.trim(),
      leaveType: leave.leaveType,
      startDate: fmtDate(leave.startDate),
      endDate: fmtDate(leave.endDate),
      days: leave.days,
      status,
      decisionReason: reason,
    });
  }
}
