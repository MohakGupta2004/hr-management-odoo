// Pure payroll math: takes salary components + attendance, returns the breakdown.
// net = gross(earnings) - deductions - lossOfPay, where lossOfPay = absentDays * perDay.

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
