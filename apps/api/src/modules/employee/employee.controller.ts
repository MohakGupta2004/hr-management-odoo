import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { z } from "zod";
import { EmployeeService } from "./employee.service";

const createEmployeeSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Invalid email format"),
  phone: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  department: z.string().trim().optional(),
  location: z.string().trim().optional(),
  managerId: z.string().trim().optional(),
  dateOfJoining: z.string().transform((str) => new Date(str)),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]).default("EMPLOYEE"),
});

const updateEmployeeSchema = z.object({
  department: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  managerId: z.string().trim().optional(),
  location: z.string().trim().optional(),
});

const listEmployeesSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export class EmployeeController {
  private employeeService = new EmployeeService();

  createEmployee = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = createEmployeeSchema.parse(req.body);
      const companyId = req.user!.companyId;

      const result = await this.employeeService.createEmployee({
        ...parsed,
        companyId,
      });

      res.status(201).json({
        employee: {
          id: result.employee.id,
          firstName: result.employee.firstName,
          lastName: result.employee.lastName,
        },
        user: {
          loginId: result.user.loginId,
        }
      });
    } catch (error) {
      next(error);
    }
  };

  getEmployees = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = listEmployeesSchema.parse(req.query);
      const companyId = req.user!.companyId;

      const result = await this.employeeService.getEmployees(companyId, parsed);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getEmployeeById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      const id = req.params.id as string;

      const employee = await this.employeeService.getEmployeeById(companyId, id);
      res.json(employee);
    } catch (error) {
      next(error);
    }
  };

  updateEmployee = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = updateEmployeeSchema.parse(req.body);
      const companyId = req.user!.companyId;
      const id = req.params.id as string;

      const updated = await this.employeeService.updateEmployee(companyId, id, parsed);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  };

  deactivateEmployee = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      const id = req.params.id as string;

      const result = await this.employeeService.deactivateEmployee(companyId, id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
