import { Router } from "express";
import { AuthController } from "./auth.controller";

export const authRouter = Router();
const authController = new AuthController();

authRouter.post("/register-company", authController.registerCompany);

/**
 * Note for Frontend:
 * When users click the verification link in their email, they will land on the frontend route:
 * `/verify?token=<token>` (configured via FRONTEND_URL in env).
 * The frontend must extract the token from query parameters and call this API:
 * GET `/auth/verify?token=<token>` to complete the email verification.
 */
authRouter.get("/verify", authController.verifyEmail);