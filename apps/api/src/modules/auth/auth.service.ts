import crypto from "crypto";
import { prisma } from "../../db/prisma";
import { redisConnection } from "../email/email.queue";
import { ConflictError, BadRequestError, UnauthorizedError, ForbiddenError } from "../../utils/errors";
import bcrypt from "bcrypt";
import { Prisma } from "../../../generated/prisma/client";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import jwt from "jsonwebtoken";

export interface RegisterCompanyInput {
  companyName: string;
  logo: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export class AuthService {
  async registerCompany(data: RegisterCompanyInput) {
    const cleanName = data.companyName
      .replace(/\b(pvt|ltd|inc|co|gmbh|llc|private|limited)\b/gi, "")
      .trim();
    
    const words = cleanName.split(/\s+/).filter(Boolean);
    let prefix = "";
    if (words.length >= 2 && words[0] && words[1]) {
      prefix = (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    } else if (words.length === 1 && words[0]) {
      prefix = words[0].substring(0, 2).toUpperCase();
    } else {
      prefix = "CO";
    }

    prefix = prefix.replace(/[^A-Z0-9]/g, "");
    if (prefix.length < 2) {
      prefix = "CO";
    }

    try {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(data.password, saltRounds);

      const result = await prisma.$transaction(async (tx) => {
        // Create company directly without check-then-insert. The DB enforces unique name and prefix.
        const company = await tx.company.create({
          data: {
            name: data.companyName,
            prefix,
            logoUrl: data.logo,
          },
        });

        const nameParts = data.fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || "Admin";
        const lastName = nameParts.slice(1).join(" ") || "User";

        const fnPart = firstName.substring(0, 2).toUpperCase().padEnd(2, "X");
        const lnPart = lastName.substring(0, 2).toUpperCase().padEnd(2, "X");
        const year = new Date().getFullYear();

        // Safe query inside transaction to determine MAX serial
        const lastEmployee = await tx.employee.findFirst({
          where: {
            companyId: company.id,
            joiningYear: year,
          },
          orderBy: {
            joiningSerial: "desc",
          },
        });

        const serial = lastEmployee ? lastEmployee.joiningSerial + 1 : 1;
        const serialStr = String(serial).padStart(4, "0");
        const loginId = `${prefix}${fnPart}${lnPart}${year}${serialStr}`;

        // Create user. Unique check handled by DB constraints.
        const user = await tx.user.create({
          data: {
            loginId,
            email: data.email,
            passwordHash,
            role: "ADMIN",
            companyId: company.id,
            mustChangePassword: false,
          },
        });

        // Create employee profile. Unique check handled by DB constraints (phone is unique).
        const employee = await tx.employee.create({
          data: {
            userId: user.id,
            companyId: company.id,
            firstName,
            lastName,
            phone: data.phone,
            dateOfJoining: new Date(),
            joiningYear: year,
            joiningSerial: serial,
            employmentStatus: "ACTIVE",
          },
        });

        return { company, user, employee };
      });

      const token = crypto.randomBytes(32).toString("hex");
      await redisConnection.set(`verification_token:${token}`, result.user.id, "EX", 86400);

      return {
        company: {
          id: result.company.id,
          name: result.company.name,
          prefix: result.company.prefix,
          logoUrl: result.company.logoUrl,
        },
        user: {
          id: result.user.id,
          loginId: result.user.loginId,
          email: result.user.email,
          role: result.user.role,
        },
        employee: {
          id: result.employee.id,
          firstName: result.employee.firstName,
          lastName: result.employee.lastName,
        },
        token,
      };
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const target = (error.meta?.target as string[]) || [];
        if (target.includes("email") || target.includes("companyId_email")) {
          throw new ConflictError("Email already exists");
        }
        if (target.includes("prefix")) {
          throw new ConflictError("Company prefix already exists");
        }
        if (target.includes("name")) {
          throw new ConflictError("Company name already exists");
        }
        if (target.includes("phone")) {
          throw new ConflictError("Phone number already in use");
        }
        if (target.includes("loginId")) {
          throw new ConflictError("Login ID already exists");
        }
      }
      throw error;
    }
  }

  async verifyEmail(token: string) {
    const redisKey = `verification_token:${token}`;
    const userId = await redisConnection.get(redisKey);

    if (!userId) {
      throw new BadRequestError("Invalid or expired token");
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
    });

    await redisConnection.del(redisKey);

    return user;
  }

  async login(dto: { identifier: string; password: string }, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.identifier },
          { loginId: dto.identifier },
        ],
      },
      select: {
        id: true,
        loginId: true,
        email: true,
        passwordHash: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        mustChangePassword: true,
        companyId: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    if (!user.isActive) {
      throw new ForbiddenError("Account disabled");
    }

    if (!user.isEmailVerified) {
      throw new ForbiddenError("Please verify your email.");
    }

    const match = await bcrypt.compare(dto.password, user.passwordHash);
    if (!match) {
      throw new UnauthorizedError("Invalid credentials");
    }

    // Pre-generate session ID and refresh token BEFORE transaction to keep transactions atomic
    const sessionId = crypto.randomUUID();
    const tokenPayload = {
      sub: user.id,
      companyId: user.companyId,
      role: user.role,
      sessionId,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.$transaction(async (tx) => {
      // Update last login timestamp
      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Session limits: count and delete oldest if >= 5
      const sessionCount = await tx.session.count({
        where: { userId: user.id },
      });

      if (sessionCount >= 5) {
        const oldestSession = await tx.session.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });
        if (oldestSession) {
          await tx.session.delete({
            where: { id: oldestSession.id },
          });
        }
      }

      // Create session using pre-generated values
      await tx.session.create({
        data: {
          id: sessionId,
          userId: user.id,
          refreshTokenHash,
          ipAddress,
          userAgent,
          expiresAt,
        },
      });
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        loginId: user.loginId,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async refreshToken(token: string, ipAddress?: string, userAgent?: string) {
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError("Invalid or expired refresh token");
      }
      throw err;
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const session = await prisma.session.findFirst({
      where: { refreshTokenHash: tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            companyId: true,
            role: true,
            isActive: true,
            isEmailVerified: true,
            mustChangePassword: true,
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedError("Invalid or expired session");
    }

    // Purge expired sessions
    if (session.expiresAt < new Date()) {
      await prisma.session.delete({
        where: { id: session.id },
      }).catch(() => {});
      throw new UnauthorizedError("Invalid or expired session");
    }

    if (decoded.sub !== session.userId) {
      throw new UnauthorizedError("Invalid or expired session");
    }

    if (!session.user.isActive) {
      throw new ForbiddenError("Account disabled");
    }

    const tokenPayload = {
      sub: session.user.id,
      companyId: session.user.companyId,
      role: session.user.role,
      sessionId: session.id,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    const newHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newHash,
        ipAddress,
        userAgent,
        expiresAt: newExpiresAt,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(token: string) {
    try {
      verifyRefreshToken(token);
    } catch (err) {
      throw new UnauthorizedError("Invalid token signature");
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await prisma.session.delete({
      where: { refreshTokenHash: tokenHash },
    }).catch(() => {});
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        loginId: true,
        email: true,
        role: true,
        mustChangePassword: true,
        company: {
          select: {
            id: true,
            name: true,
            prefix: true,
            logoUrl: true,
          },
        },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            designation: true,
            department: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    return {
      ...user,
      // TODO: Query dynamic attendance status from the database once the Attendance module is implemented
      attendanceStatus: "CHECKED_OUT" as const,
    };
  }
}
