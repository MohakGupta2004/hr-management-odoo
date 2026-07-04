import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { z } from "zod";
import { EmployeeService } from "./employee.service";
import { BadRequestError } from "../../utils/errors";

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

const createSkillSchema = z.object({
  name: z.string().trim().min(1, "Skill name is required"),
});

const createCertificationSchema = z.object({
  name: z.string().trim().min(1, "Certification name is required"),
  issuedBy: z.string().trim().min(1, "Issued by is required"),
  issuedAt: z.string().transform((str) => new Date(str)),
});

const createDocumentSchema = z.object({
  title: z.string().trim().min(1, "Document title is required"),
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

  getMyProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;

      const employee = await this.employeeService.getMyProfile(companyId, userId);
      res.json(employee);
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

  addSkill = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = createSkillSchema.parse(req.body);
      const companyId = req.user!.companyId;
      const employeeId = req.params.id as string;

      const skill = await this.employeeService.addSkill(companyId, employeeId, parsed.name);
      res.status(201).json(skill);
    } catch (error) {
      next(error);
    }
  };

  removeSkill = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      const employeeId = req.params.id as string;
      const skillId = req.params.skillId as string;

      const result = await this.employeeService.removeSkill(companyId, employeeId, skillId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  addCertification = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      console.log("[addCertification] req.body:", req.body);
      console.log("[addCertification] req.file:", req.file);
      const parsed = createCertificationSchema.parse(req.body);
      const companyId = req.user!.companyId;
      const employeeId = req.params.id as string;
      const fileBuffer = req.file ? req.file.buffer : undefined;

      const cert = await this.employeeService.addCertification(companyId, employeeId, {
        ...parsed,
        fileBuffer,
      });
      res.status(201).json(cert);
    } catch (error) {
      next(error);
    }
  };

  removeCertification = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      const employeeId = req.params.id as string;
      const certId = req.params.certId as string;

      const result = await this.employeeService.removeCertification(companyId, employeeId, certId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  addDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = createDocumentSchema.parse(req.body);
      const companyId = req.user!.companyId;
      const employeeId = req.params.id as string;

      if (!req.file) {
        throw new BadRequestError("File upload is required");
      }

      const document = await this.employeeService.addDocument(companyId, employeeId, {
        title: parsed.title,
        fileBuffer: req.file.buffer,
      });

      res.status(201).json(document);
    } catch (error) {
      next(error);
    }
  };

  getDocuments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      const employeeId = req.params.id as string;

      const docs = await this.employeeService.getDocuments(companyId, employeeId);
      res.json(docs);
    } catch (error) {
      next(error);
    }
  };

  removeDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      const employeeId = req.params.id as string;
      const docId = req.params.docId as string;

      const result = await this.employeeService.removeDocument(companyId, employeeId, docId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
