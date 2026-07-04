import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { UnauthorizedError, ForbiddenError } from "../utils/errors";
import { prisma } from "../db/prisma";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    companyId: string;
    role: string;
    mustChangePassword: boolean;
    sessionId: string;
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Authentication token is required");
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new UnauthorizedError("Authentication token is required");
    }

    try {
      const decoded = verifyAccessToken(token);

      // Fetch dynamic user status from database to enforce instant block updates (e.g. deactivated account)
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        select: {
          id: true,
          isActive: true,
          isEmailVerified: true,
          mustChangePassword: true,
        },
      });

      if (!user) {
        throw new UnauthorizedError("User not found");
      }

      if (!user.isActive) {
        throw new ForbiddenError("Account disabled");
      }

      if (!user.isEmailVerified) {
        throw new ForbiddenError("Please verify your email first.");
      }

      // Enforce mustChangePassword route blocks
      if (user.mustChangePassword) {
        const isAllowedRoute =
          req.originalUrl.endsWith("/change-password") ||
          req.originalUrl.endsWith("/me") ||
          req.originalUrl.endsWith("/logout");

        if (!isAllowedRoute) {
          throw new ForbiddenError("Must change password first");
        }
      }

      req.user = {
        userId: decoded.sub,
        companyId: decoded.companyId,
        role: decoded.role,
        mustChangePassword: user.mustChangePassword,
        sessionId: decoded.sessionId,
      };
      next();
    } catch (jwtError) {
      if (jwtError instanceof UnauthorizedError || jwtError instanceof ForbiddenError) {
        throw jwtError;
      }
      throw new UnauthorizedError("Invalid or expired token");
    }
  } catch (error) {
    next(error);
  }
}
