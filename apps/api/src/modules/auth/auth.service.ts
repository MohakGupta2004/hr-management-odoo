import crypto from "crypto";
import { prisma } from "../../db/prisma";
import { redisConnection } from "../email/email.queue";
import { ConflictError, BadRequestError } from "../../utils/errors";
import bcrypt from "bcrypt";
import { Prisma } from "../../../generated/prisma/client";

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
    // 1. Generate prefix (initials of first two words, ignoring corporate suffixes)
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

    // 2. Hash password with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Enforce company name uniqueness check
        const existingCompanyName = await tx.company.findFirst({
          where: { name: data.companyName },
        });
        if (existingCompanyName) {
          throw new ConflictError("Company name already exists");
        }

        // Check if prefix already exists
        const existingPrefix = await tx.company.findUnique({
          where: { prefix },
        });
        if (existingPrefix) {
          throw new ConflictError("Company prefix already exists");
        }

        // Check if email already exists
        const existingEmail = await tx.user.findFirst({
          where: { email: data.email },
        });
        if (existingEmail) {
          throw new ConflictError("Email already exists");
        }

        // Check if phone already exists
        const existingPhone = await tx.employee.findFirst({
          where: { phone: data.phone },
        });
        if (existingPhone) {
          throw new ConflictError("Phone number already in use");
        }

        // Create the company
        const company = await tx.company.create({
          data: {
            name: data.companyName,
            prefix,
            logoUrl: data.logo,
          },
        });

        // Compute loginId for admin
        const nameParts = data.fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || "Admin";
        const lastName = nameParts.slice(1).join(" ") || "User";

        const fnPart = firstName.substring(0, 2).toUpperCase().padEnd(2, "X");
        const lnPart = lastName.substring(0, 2).toUpperCase().padEnd(2, "X");
        const year = new Date().getFullYear();

        // Get MAX serial inside transaction to avoid race conditions
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

        // Create the admin user
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

        // Create the employee profile
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

      // Generate verification token using crypto.randomBytes(32).toString("hex")
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
        if (target.includes("email")) {
          throw new ConflictError("Email already exists");
        }
        if (target.includes("prefix")) {
          throw new ConflictError("Company prefix already exists");
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
}
