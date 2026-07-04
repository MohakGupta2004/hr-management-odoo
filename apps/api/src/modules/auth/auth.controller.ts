import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AuthService } from "./auth.service";
import { addEmailToQueue } from "../email/email.queue";
import { BadRequestError } from "../../utils/errors";

const registerCompanySchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required"),
  logo: z.string().trim().url("Logo must be a valid URL"),
  fullName: z.string().trim().min(1, "Full name is required"),
  email: z.string().trim().email("Invalid email format"),
  phone: z.string().trim().regex(/^\+?[0-9\s\-()]{7,20}$/, "Invalid phone number format"),
  password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(/[@$!%*?&#^()_+=\[\]{};':"\\|,.<>\/?~`-]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export class AuthController {
  private authService = new AuthService();

  registerCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = registerCompanySchema.safeParse(req.body);
      if (!validation.success) {
        const errorMsg = validation.error.issues[0]?.message || "Validation failed";
        throw new BadRequestError(errorMsg);
      }

      const result = await this.authService.registerCompany(validation.data);

      await addEmailToQueue({
        email: validation.data.email,
        fullName: validation.data.fullName,
        token: result.token,
      });

      res.status(201).json({
        company: result.company,
        user: result.user,
        employee: result.employee,
        message: "Verification email sent successfully.",
      });
    } catch (error) {
      next(error);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        throw new BadRequestError("Verification token is required");
      }

      await this.authService.verifyEmail(token);

      res.status(200).json({ message: "Email verified successfully." });
    } catch (error) {
      next(error);
    }
  };
}
