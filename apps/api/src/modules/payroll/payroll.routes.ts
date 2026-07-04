import { Router } from "express";
import { PayrollController } from "./payroll.controller";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

const controller = new PayrollController();
const adminOnly = requireRole(["ADMIN"]);

// ---- /salary-structures (admin/HR) ----
export const salaryStructureRouter = Router();
salaryStructureRouter.use(requireAuth);
salaryStructureRouter.post("/", adminOnly, controller.createSalaryStructure);
salaryStructureRouter.get("/:employeeId", adminOnly, controller.getSalaryStructure);
salaryStructureRouter.patch("/:id", adminOnly, controller.updateSalaryStructure);
salaryStructureRouter.post("/:id/components", adminOnly, controller.addComponent);

// ---- /salary-components (admin/HR) ----
export const salaryComponentRouter = Router();
salaryComponentRouter.use(requireAuth);
salaryComponentRouter.patch("/:id", adminOnly, controller.updateComponent);
salaryComponentRouter.delete("/:id", adminOnly, controller.deleteComponent);

// ---- /payroll (admin/HR) ----
export const payrollRouter = Router();
payrollRouter.use(requireAuth);
payrollRouter.post("/generate", adminOnly, controller.generatePayslip);

// ---- /payslips ----
export const payslipRouter = Router();
payslipRouter.use(requireAuth);
payslipRouter.get("/me", controller.getMyPayslips); // before "/:id/..."
payslipRouter.get("/:id/pdf", controller.getPayslipPdf); // owner or admin (checked in service)
payslipRouter.get("/", adminOnly, controller.listPayslips);
