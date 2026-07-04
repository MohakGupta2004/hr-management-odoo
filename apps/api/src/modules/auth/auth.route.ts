import { Router } from "express";
import { AuthController } from "./auth.controller";
import { requireAuth } from "../../middleware/auth.middleware";

export const authRouter = Router();
const authController = new AuthController();

authRouter.post("/register-company", authController.registerCompany);
authRouter.get("/verify", authController.verifyEmail);

authRouter.post("/login", authController.login);
authRouter.post("/refresh", authController.refreshToken);
authRouter.post("/logout", authController.logout);
authRouter.get("/me", requireAuth as any, authController.me);