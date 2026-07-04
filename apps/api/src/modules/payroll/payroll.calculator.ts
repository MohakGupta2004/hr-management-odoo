/**
 * PayrollCalculator — the pure calculation layer for payroll.
 *
 * It has NO knowledge of the database, HTTP, or Prisma. It accepts structured
 * inputs (salary components + attendance summary) and returns a fully-computed,
 * serializable breakdown. Keeping payroll policy isolated here means deduction
 * rules, LOP (loss-of-pay) logic, bonuses or tax slabs can change without
 * touching the service or controller layers.
 *
 * Policy implemented (kept intentionally simple, matching the project spec):
 *   grossSalary      = Σ EARNING components
 *   componentDeducts = Σ DEDUCTION components
 *   perDaySalary     = round(grossSalary / workingDays)
 *   lossOfPay        = absentDays * perDaySalary        (only explicit ABSENT days)
 *   totalDeductions  = componentDeducts + lossOfPay
 *   netSalary        = grossSalary - totalDeductions
 *
 * Approved (paid) leave and present days are NOT deducted. "workingDays" is the
 * number of calendar days in the payroll month; weekend/holiday-aware working-day
 * calculation is a deliberate future enhancement.
 */

export type SalaryComponentType = "EARNING" | "DEDUCTION";

export interface SalaryComponentInput {
  name: string;
  type: SalaryComponentType;
  amount: number;
}

export interface AttendanceSummary {
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  absentDays: number;
}

export interface PayrollLineItem {
  name: string;
  amount: number;
}

export interface PayrollBreakdown {
  earnings: PayrollLineItem[];
  deductions: PayrollLineItem[];
  lossOfPay: {
    absentDays: number;
    perDaySalary: number;
    amount: number;
  };
  attendance: AttendanceSummary;
}

export interface PayrollCalculationResult {
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  perDaySalary: number;
  breakdown: PayrollBreakdown;
}

export class PayrollCalculator {
  calculate(input: {
    components: SalaryComponentInput[];
    attendance: AttendanceSummary;
  }): PayrollCalculationResult {
    const { components, attendance } = input;

    if (attendance.workingDays <= 0) {
      throw new Error("workingDays must be greater than zero");
    }

    const earnings = components.filter((c) => c.type === "EARNING");
    const deductions = components.filter((c) => c.type === "DEDUCTION");

    const grossSalary = earnings.reduce((sum, c) => sum + c.amount, 0);
    const componentDeductions = deductions.reduce((sum, c) => sum + c.amount, 0);

    const perDaySalary = Math.round(grossSalary / attendance.workingDays);
    const lossOfPay = Math.round(perDaySalary * attendance.absentDays);

    const totalDeductions = componentDeductions + lossOfPay;
    const netSalary = grossSalary - totalDeductions;

    return {
      grossSalary,
      totalDeductions,
      netSalary,
      perDaySalary,
      breakdown: {
        earnings: earnings.map((c) => ({ name: c.name, amount: c.amount })),
        deductions: deductions.map((c) => ({ name: c.name, amount: c.amount })),
        lossOfPay: {
          absentDays: attendance.absentDays,
          perDaySalary,
          amount: lossOfPay,
        },
        attendance,
      },
    };
  }
}
