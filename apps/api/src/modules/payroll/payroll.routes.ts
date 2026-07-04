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
// Self-service first (literal path before the "/:id/..." param route)
payslipRouter.get("/me", controller.getMyPayslips);
// Owner (self) or admin — ownership enforced in the service
payslipRouter.get("/:id/pdf", controller.getPayslipPdf);
// Admin history
payslipRouter.get("/", adminOnly, controller.listPayslips);
