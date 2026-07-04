import { prisma } from "../../db/prisma";
import { Prisma } from "../../../generated/prisma/client";
import { BadRequestError, ConflictError, NotFoundError } from "../../utils/errors";
import { PayrollCalculator } from "./payroll.calculator";
import type { AttendanceSummary, PayrollBreakdown } from "./payroll.calculator";
import { generatePayslipPdf } from "./payroll.pdf";
import type {
  CreateComponentInput,
  CreateSalaryStructureInput,
  GeneratePayslipInput,
  ListPayslipsQuery,
  MyPayslipsQuery,
  UpdateComponentInput,
} from "./payroll.validation";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatStructure(s: {
  id: string;
  employeeId: string;
  effectiveFrom: Date;
  components: { id: string; name: string; type: string; amount: number }[];
}) {
  const earnings = s.components.filter((c) => c.type === "EARNING");
  const deductions = s.components.filter((c) => c.type === "DEDUCTION");
  return {
    id: s.id,
    employeeId: s.employeeId,
    effectiveFrom: s.effectiveFrom.toISOString().substring(0, 10),
    components: s.components.map((c) => ({ id: c.id, name: c.name, type: c.type, amount: c.amount })),
    totals: {
      earnings: earnings.reduce((sum, c) => sum + c.amount, 0),
      deductions: deductions.reduce((sum, c) => sum + c.amount, 0),
    },
  };
}

export class PayrollService {
  private calculator = new PayrollCalculator();

  // ---- Salary Structure ----

  async createSalaryStructure(companyId: string, data: CreateSalaryStructureInput) {
    const employee = await prisma.employee.findFirst({ where: { id: data.employeeId, companyId } });
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    const existing = await prisma.salaryStructure.findUnique({ where: { employeeId: data.employeeId } });
    if (existing) {
      throw new ConflictError("Salary structure already exists for this employee");
    }

    const effectiveFrom = data.effectiveFrom ? new Date(data.effectiveFrom) : new Date();

    const structure = await prisma.salaryStructure.create({
      data: {
        employeeId: data.employeeId,
        effectiveFrom,
        components: data.components
          ? { create: data.components.map((c) => ({ name: c.name, type: c.type, amount: c.amount })) }
          : undefined,
      },
      include: { components: true },
    });

    return formatStructure(structure);
  }

  async getSalaryStructure(companyId: string, employeeId: string) {
    const structure = await prisma.salaryStructure.findFirst({
      where: { employeeId, employee: { companyId } },
      include: { components: { orderBy: { createdAt: "asc" } } },
    });
    if (!structure) {
      throw new NotFoundError("Salary structure not found");
    }
    return formatStructure(structure);
  }

  async updateSalaryStructure(companyId: string, id: string, effectiveFrom: string) {
    const structure = await prisma.salaryStructure.findFirst({
      where: { id, employee: { companyId } },
    });
    if (!structure) {
      throw new NotFoundError("Salary structure not found");
    }

    const updated = await prisma.salaryStructure.update({
      where: { id },
      data: { effectiveFrom: new Date(effectiveFrom) },
      include: { components: { orderBy: { createdAt: "asc" } } },
    });
    return formatStructure(updated);
  }

  // ---- Salary Components ----

  async addComponent(companyId: string, structureId: string, data: CreateComponentInput) {
    const structure = await prisma.salaryStructure.findFirst({
      where: { id: structureId, employee: { companyId } },
    });
    if (!structure) {
      throw new NotFoundError("Salary structure not found");
    }

    const component = await prisma.salaryComponent.create({
      data: { salaryStructureId: structureId, name: data.name, type: data.type, amount: data.amount },
    });
    return { id: component.id, name: component.name, type: component.type, amount: component.amount };
  }

  async updateComponent(companyId: string, componentId: string, data: UpdateComponentInput) {
    const component = await prisma.salaryComponent.findFirst({
      where: { id: componentId, salaryStructure: { employee: { companyId } } },
    });
    if (!component) {
      throw new NotFoundError("Salary component not found");
    }

    const updated = await prisma.salaryComponent.update({
      where: { id: componentId },
      data: {
        name: data.name ?? undefined,
        type: data.type ?? undefined,
        amount: data.amount ?? undefined,
      },
    });
    return { id: updated.id, name: updated.name, type: updated.type, amount: updated.amount };
  }

  async deleteComponent(companyId: string, componentId: string) {
    const component = await prisma.salaryComponent.findFirst({
      where: { id: componentId, salaryStructure: { employee: { companyId } } },
    });
    if (!component) {
      throw new NotFoundError("Salary component not found");
    }

    await prisma.salaryComponent.delete({ where: { id: componentId } });
    return { message: "Salary component removed successfully" };
  }

  // ---- Payslip generation ----

  private async buildAttendanceSummary(employeeId: string, month: number, year: number): Promise<AttendanceSummary> {
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 1));
    const workingDays = new Date(Date.UTC(year, month, 0)).getUTCDate(); // calendar days in month

    const rows = await prisma.attendance.findMany({
      where: { employeeId, date: { gte: from, lt: to } },
      select: { status: true },
    });

    // Rule 3: attendance data must exist for the pay period.
    if (rows.length === 0) {
      throw new BadRequestError(
        `No attendance records found for ${MONTHS[month - 1]} ${year}. Cannot generate payslip.`
      );
    }

    let presentDays = 0;
    let leaveDays = 0;
    let absentDays = 0;
    for (const r of rows) {
      if (r.status === "PRESENT" || r.status === "HALF_DAY") presentDays++;
      else if (r.status === "LEAVE") leaveDays++;
      else if (r.status === "ABSENT") absentDays++;
    }

    return { workingDays, presentDays, leaveDays, absentDays };
  }

  async generatePayslip(companyId: string, adminUserId: string, input: GeneratePayslipInput) {
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, companyId },
    });
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    // Rule 1: cannot generate twice for the same period.
    const duplicate = await prisma.payslip.findUnique({
      where: {
        employeeId_month_year: { employeeId: input.employeeId, month: input.month, year: input.year },
      },
    });
    if (duplicate) {
      throw new ConflictError(
        `Payslip for ${MONTHS[input.month - 1]} ${input.year} already exists for this employee`
      );
    }

    // Rule 2: salary structure required.
    const structure = await prisma.salaryStructure.findUnique({
      where: { employeeId: input.employeeId },
      include: { components: true },
    });
    if (!structure) {
      throw new BadRequestError("Employee has no salary structure. Please set one up first.");
    }
    if (structure.components.length === 0) {
      throw new BadRequestError("Salary structure has no components to calculate payroll from.");
    }

    // Reads Attendance + Leave (leave already reflected as LEAVE attendance rows).
    const attendance = await this.buildAttendanceSummary(input.employeeId, input.month, input.year);

    const result = this.calculator.calculate({
      components: structure.components.map((c) => ({
        name: c.name,
        type: c.type as "EARNING" | "DEDUCTION",
        amount: c.amount,
      })),
      attendance,
    });

    // Resolve approver's employee id for the audit trail (optional).
    const generator = await prisma.employee.findUnique({ where: { userId: adminUserId } });

    const payslip = await prisma.payslip.create({
      data: {
        employeeId: input.employeeId,
        month: input.month,
        year: input.year,
        workingDays: attendance.workingDays,
        presentDays: attendance.presentDays,
        leaveDays: attendance.leaveDays,
        absentDays: attendance.absentDays,
        grossSalary: result.grossSalary,
        totalDeductions: result.totalDeductions,
        netSalary: result.netSalary,
        breakdown: result.breakdown as unknown as Prisma.InputJsonValue,
        generatedById: generator?.id ?? null,
      },
    });

    return this.formatPayslip(payslip);
  }

  private formatPayslip(p: {
    id: string;
    employeeId: string;
    month: number;
    year: number;
    workingDays: number;
    presentDays: number;
    leaveDays: number;
    absentDays: number;
    grossSalary: number;
    totalDeductions: number;
    netSalary: number;
    breakdown: unknown;
    generatedAt: Date;
  }) {
    return {
      id: p.id,
      employeeId: p.employeeId,
      month: p.month,
      monthName: MONTHS[p.month - 1],
      year: p.year,
      workingDays: p.workingDays,
      presentDays: p.presentDays,
      leaveDays: p.leaveDays,
      absentDays: p.absentDays,
      grossSalary: p.grossSalary,
      totalDeductions: p.totalDeductions,
      netSalary: p.netSalary,
      breakdown: p.breakdown,
      generatedAt: p.generatedAt.toISOString(),
    };
  }

  // ---- Payslip history ----

  async getMyPayslips(userId: string, params: MyPayslipsQuery) {
    const employee = await prisma.employee.findUnique({ where: { userId } });
    if (!employee) {
      throw new NotFoundError("Employee profile not found");
    }

    const page = params.page || 1;
    const limit = params.limit || 12;
    const skip = (page - 1) * limit;

    const where: Prisma.PayslipWhereInput = { employeeId: employee.id };
    if (params.year) where.year = params.year;

    const [records, total] = await Promise.all([
      prisma.payslip.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ year: "desc" }, { month: "desc" }],
      }),
      prisma.payslip.count({ where }),
    ]);

    return {
      records: records.map((p) => this.formatPayslip(p)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async listPayslips(companyId: string, params: ListPayslipsQuery) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PayslipWhereInput = { employee: { companyId } };
    if (params.employee) where.employeeId = params.employee;
    if (params.month) where.month = params.month;
    if (params.year) where.year = params.year;

    const [records, total] = await Promise.all([
      prisma.payslip.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ year: "desc" }, { month: "desc" }],
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, department: true } },
        },
      }),
      prisma.payslip.count({ where }),
    ]);

    return {
      data: records.map((p) => ({
        ...this.formatPayslip(p),
        employee: {
          id: p.employee.id,
          name: `${p.employee.firstName} ${p.employee.lastName}`.trim(),
          department: p.employee.department,
        },
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ---- PDF ----

  // Renders a payslip to a PDF buffer. Admins: any payslip in the company; others: own only.
  async getPayslipPdf(params: { companyId: string; userId: string; role: string; payslipId: string }) {
    const payslip = await prisma.payslip.findFirst({
      where: { id: params.payslipId, employee: { companyId: params.companyId } },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            designation: true,
            department: true,
            userId: true,
            user: { select: { loginId: true } },
            company: { select: { name: true, logoUrl: true } },
          },
        },
      },
    });

    if (!payslip) {
      throw new NotFoundError("Payslip not found");
    }

    // Ownership check for non-admins.
    if (params.role !== "ADMIN" && payslip.employee.userId !== params.userId) {
      throw new NotFoundError("Payslip not found");
    }

    const buffer = await generatePayslipPdf({
      company: { name: payslip.employee.company.name, logoUrl: payslip.employee.company.logoUrl },
      employee: {
        name: `${payslip.employee.firstName} ${payslip.employee.lastName}`.trim(),
        loginId: payslip.employee.user.loginId,
        designation: payslip.employee.designation,
        department: payslip.employee.department,
      },
      month: payslip.month,
      year: payslip.year,
      generatedAt: payslip.generatedAt,
      grossSalary: payslip.grossSalary,
      totalDeductions: payslip.totalDeductions,
      netSalary: payslip.netSalary,
      breakdown: payslip.breakdown as unknown as PayrollBreakdown,
    });

    const filename = `payslip-${MONTHS[payslip.month - 1]}-${payslip.year}.pdf`;
    return { buffer, filename };
  }
}
