import { Router } from "express";
import { EmployeeController } from "./employee.controller";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import multer, { type FileFilterCallback } from "multer";
import crypto from "crypto";
import path from "path";
import { BadRequestError } from "../../utils/errors";
import type { Request } from "express";

export const employeeRouter = Router();
const employeeController = new EmployeeController();

const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new BadRequestError("Only PDF or image files (JPEG, PNG, WEBP, GIF) are allowed"));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter,
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
