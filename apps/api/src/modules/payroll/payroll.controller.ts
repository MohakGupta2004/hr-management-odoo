import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { PayrollService } from "./payroll.service";
import {
  createComponentSchema,
  createSalaryStructureSchema,
  generatePayslipSchema,
  listPayslipsSchema,
  myPayslipsSchema,
  updateComponentSchema,
  updateSalaryStructureSchema,
} from "./payroll.validation";

export class PayrollController {
  private payrollService = new PayrollService();

  // ---- Salary Structure ----

  createSalaryStructure = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = createSalaryStructureSchema.parse(req.body);
      const result = await this.payrollService.createSalaryStructure(req.user!.companyId, parsed);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  getSalaryStructure = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const employeeId = req.params.employeeId as string;
      const result = await this.payrollService.getSalaryStructure(req.user!.companyId, employeeId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  updateSalaryStructure = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = updateSalaryStructureSchema.parse(req.body);
      const id = req.params.id as string;
      const result = await this.payrollService.updateSalaryStructure(req.user!.companyId, id, parsed.effectiveFrom);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  // ---- Salary Components ----

  addComponent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = createComponentSchema.parse(req.body);
      const structureId = req.params.id as string;
      const result = await this.payrollService.addComponent(req.user!.companyId, structureId, parsed);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  updateComponent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = updateComponentSchema.parse(req.body);
      const componentId = req.params.id as string;
      const result = await this.payrollService.updateComponent(req.user!.companyId, componentId, parsed);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  deleteComponent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const componentId = req.params.id as string;
      const result = await this.payrollService.deleteComponent(req.user!.companyId, componentId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  // ---- Payslip generation ----

  generatePayslip = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = generatePayslipSchema.parse(req.body);
      const result = await this.payrollService.generatePayslip(req.user!.companyId, req.user!.userId, parsed);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  // ---- Payslip history ----

  getMyPayslips = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = myPayslipsSchema.parse(req.query);
      const result = await this.payrollService.getMyPayslips(req.user!.userId, parsed);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  listPayslips = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = listPayslipsSchema.parse(req.query);
      const result = await this.payrollService.listPayslips(req.user!.companyId, parsed);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getPayslipPdf = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { buffer, filename } = await this.payrollService.getPayslipPdf({
        companyId: req.user!.companyId,
        userId: req.user!.userId,
        role: req.user!.role,
        payslipId: req.params.id as string,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };
}
