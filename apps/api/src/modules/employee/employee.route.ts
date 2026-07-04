import { Router } from "express";
import { EmployeeController } from "./employee.controller";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import multer from "multer";
import crypto from "crypto";
import path from "path";

export const employeeRouter = Router();
const employeeController = new EmployeeController();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

employeeRouter.use(requireAuth);
employeeRouter.use(requireRole(["ADMIN"])); // Admin only routes for now

employeeRouter.post("/", employeeController.createEmployee);
employeeRouter.get("/", employeeController.getEmployees);
employeeRouter.get("/:id", employeeController.getEmployeeById);
employeeRouter.patch("/:id", employeeController.updateEmployee);
employeeRouter.delete("/:id", employeeController.deactivateEmployee);

// Skills
employeeRouter.post("/:id/skills", employeeController.addSkill);
employeeRouter.delete("/:id/skills/:skillId", employeeController.removeSkill);

// Certifications
employeeRouter.post("/:id/certifications", upload.single("file"), employeeController.addCertification);
employeeRouter.delete("/:id/certifications/:certId", employeeController.removeCertification);

// Documents
employeeRouter.post("/:id/documents", upload.single("file"), employeeController.addDocument);
employeeRouter.get("/:id/documents", employeeController.getDocuments);
employeeRouter.delete("/:id/documents/:docId", employeeController.removeDocument);
