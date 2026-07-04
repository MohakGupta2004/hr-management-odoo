import { Router } from "express";
import { EmployeeController } from "./employee.controller";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../../middleware/auth.middleware";
import multer, { type FileFilterCallback } from "multer";
import crypto from "crypto";
import path from "path";
import { BadRequestError, ForbiddenError } from "../../utils/errors";
import { prisma } from "../../db/prisma";
import type { Request, Response, NextFunction } from "express";

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

// Self-service: any authenticated employee viewing/editing their own record.
// Must stay above "/:id" so it isn't swallowed as an id param.
employeeRouter.get("/me", employeeController.getMyProfile);

async function requireAdminOrSelf(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (req.user!.role === "ADMIN") return next();

    const employee = await prisma.employee.findFirst({
      where: { id: req.params.id as string, companyId: req.user!.companyId },
      select: { userId: true },
    });

    if (employee && employee.userId === req.user!.userId) return next();

    return next(new ForbiddenError("You do not have permission to perform this action"));
  } catch (error) {
    next(error);
  }
}

employeeRouter.patch("/:id", requireAdminOrSelf, employeeController.updateEmployee);

// Admin only routes
employeeRouter.use(requireRole(["ADMIN"]));

employeeRouter.post("/", employeeController.createEmployee);
employeeRouter.get("/", employeeController.getEmployees);
employeeRouter.get("/:id", employeeController.getEmployeeById);
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
