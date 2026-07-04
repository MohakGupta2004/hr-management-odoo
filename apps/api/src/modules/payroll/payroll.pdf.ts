import PDFDocument from "pdfkit";
import type { PayrollBreakdown } from "./payroll.calculator";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface PayslipPdfData {
  company: { name: string; logoUrl: string | null };
  employee: { name: string; loginId: string; designation: string | null; department: string | null };
  month: number;
  year: number;
  generatedAt: Date;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  breakdown: PayrollBreakdown;
}

function inr(n: number): string {
  return "INR " + n.toLocaleString("en-IN");
}

async function fetchLogo(url: string | null): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    // pdfkit only supports PNG/JPEG
    if (!/png|jpe?g/i.test(contentType)) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

// Renders a payslip PDF in memory and resolves with the Buffer.
export async function generatePayslipPdf(data: PayslipPdfData): Promise<Buffer> {
  const logo = await fetchLogo(data.company.logoUrl);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const accent = "#4f46e5";
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;

    // ---- Header ----
    if (logo) {
      try {
        doc.image(logo, left, 45, { fit: [60, 60] });
      } catch {
        /* ignore malformed image */
      }
    }
    doc.fontSize(20).fillColor(accent).text(data.company.name, logo ? left + 75 : left, 50);
    doc.fontSize(12).fillColor("#333").text("Payslip", logo ? left + 75 : left);
    doc
      .fontSize(10)
      .fillColor("#666")
      .text(`Pay Period: ${MONTHS[data.month - 1]} ${data.year}`, logo ? left + 75 : left);

    doc.moveTo(left, 120).lineTo(left + pageWidth, 120).strokeColor("#e0e0e0").stroke();

    // ---- Employee details ----
    let y = 135;
    doc.fontSize(11).fillColor("#333");
    doc.text(`Employee: ${data.employee.name}`, left, y);
    doc.text(`Login ID: ${data.employee.loginId}`, left + pageWidth / 2, y);
    y += 18;
    doc.text(`Designation: ${data.employee.designation ?? "-"}`, left, y);
    doc.text(`Department: ${data.employee.department ?? "-"}`, left + pageWidth / 2, y);
    y += 18;
    const a = data.breakdown.attendance;
    doc.text(
      `Attendance: ${a.presentDays} present, ${a.leaveDays} leave, ${a.absentDays} absent of ${a.workingDays} days`,
      left,
      y
    );

    // ---- Earnings & Deductions tables ----
    y += 35;
    const colGap = 20;
    const colWidth = (pageWidth - colGap) / 2;
    const rightColX = left + colWidth + colGap;

    const drawTableHeader = (x: number, title: string) => {
      doc.rect(x, y, colWidth, 22).fill(accent);
      doc.fillColor("#fff").fontSize(11).text(title, x + 8, y + 6, { width: colWidth - 16 });
    };
    drawTableHeader(left, "Earnings");
    drawTableHeader(rightColX, "Deductions");

    const deductionRows: { name: string; amount: number }[] = [
      ...data.breakdown.deductions,
    ];
    if (data.breakdown.lossOfPay.amount > 0) {
      deductionRows.push({
        name: `Loss of Pay (${data.breakdown.lossOfPay.absentDays}d)`,
        amount: data.breakdown.lossOfPay.amount,
      });
    }

    const rowHeight = 20;
    const rowsCount = Math.max(data.breakdown.earnings.length, deductionRows.length);
    let rowY = y + 22;
    doc.fontSize(10).fillColor("#333");
    for (let i = 0; i < rowsCount; i++) {
      const earning = data.breakdown.earnings[i];
      const deduction = deductionRows[i];

      if (earning) {
        doc.fillColor("#333").text(earning.name, left + 8, rowY + 5, { width: colWidth - 90 });
        doc.text(inr(earning.amount), left + colWidth - 82, rowY + 5, { width: 74, align: "right" });
      }
      if (deduction) {
        doc.fillColor("#333").text(deduction.name, rightColX + 8, rowY + 5, { width: colWidth - 90 });
        doc.text(inr(deduction.amount), rightColX + colWidth - 82, rowY + 5, { width: 74, align: "right" });
      }
      doc.moveTo(left, rowY + rowHeight).lineTo(left + pageWidth, rowY + rowHeight).strokeColor("#f0f0f0").stroke();
      rowY += rowHeight;
    }

    // Totals row
    doc.fontSize(10).fillColor("#111");
    doc.text("Gross Salary", left + 8, rowY + 6, { width: colWidth - 90 });
    doc.text(inr(data.grossSalary), left + colWidth - 82, rowY + 6, { width: 74, align: "right" });
    doc.text("Total Deductions", rightColX + 8, rowY + 6, { width: colWidth - 90 });
    doc.text(inr(data.totalDeductions), rightColX + colWidth - 82, rowY + 6, { width: 74, align: "right" });

    // ---- Net pay banner ----
    rowY += 40;
    doc.rect(left, rowY, pageWidth, 40).fill("#f9fafb");
    doc.fillColor("#111").fontSize(13).text("Net Salary", left + 12, rowY + 12);
    doc.fillColor(accent).fontSize(15).text(inr(data.netSalary), left, rowY + 11, {
      width: pageWidth - 12,
      align: "right",
    });

    // ---- Footer ----
    doc
      .fontSize(8)
      .fillColor("#999")
      .text(
        `Generated on ${data.generatedAt.toISOString().substring(0, 10)}. This is a system-generated payslip.`,
        left,
        rowY + 70,
        { width: pageWidth, align: "center" }
      );

    doc.end();
  });
}
