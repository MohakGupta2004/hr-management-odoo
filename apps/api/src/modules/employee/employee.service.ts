import { prisma } from "../../db/prisma";
import { IdentityService } from "../identity/identity.service";
import { addWelcomeEmailToQueue } from "../email/email.queue";
import { ConflictError, BadRequestError, NotFoundError } from "../../utils/errors";
import bcrypt from "bcrypt";
import { Prisma } from "../../../generated/prisma/client";

export interface CreateEmployeeInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  designation?: string;
  department?: string;
  location?: string;
  managerId?: string;
  dateOfJoining: Date;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  companyId: string;
}

export class EmployeeService {
  private identityService = new IdentityService();

  async createEmployee(data: CreateEmployeeInput) {
    if (data.managerId) {
      const manager = await prisma.employee.findUnique({
        where: { id: data.managerId },
        include: { user: true },
      });

      if (!manager) {
        throw new BadRequestError("Manager not found");
      }
      if (manager.companyId !== data.companyId) {
        throw new BadRequestError("Manager belongs to a different company");
      }
      if (!manager.user.isActive) {
        throw new BadRequestError("Manager is not active");
      }
    }

    const company = await prisma.company.findUnique({
      where: { id: data.companyId },
    });
    if (!company) {
      throw new NotFoundError("Company not found");
    }

    const tempPassword = this.identityService.generateTemporaryPassword();
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(tempPassword, saltRounds);
    const year = data.dateOfJoining.getFullYear();

    try {
      const result = await prisma.$transaction(async (tx) => {
        const serial = await this.identityService.getNextJoiningSerial(tx, data.companyId, year);
        const loginId = this.identityService.generateLoginId(company.prefix, data.firstName, data.lastName, year, serial);

        const user = await tx.user.create({
          data: {
            loginId,
            email: data.email,
            passwordHash,
            role: data.role,
            companyId: data.companyId,
            mustChangePassword: true,
            isEmailVerified: true, // Employees created by Admin are pre-verified
          },
        });

        const employee = await tx.employee.create({
          data: {
            userId: user.id,
            companyId: data.companyId,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            designation: data.designation,
            department: data.department,
            location: data.location,
            managerId: data.managerId,
            dateOfJoining: data.dateOfJoining,
            joiningYear: year,
            joiningSerial: serial,
            employmentStatus: "ACTIVE",
          },
        });

        return { user, employee };
      });

      // Queue welcome email
      await addWelcomeEmailToQueue({
        email: result.user.email,
        fullName: `${result.employee.firstName} ${result.employee.lastName}`.trim(),
        loginId: result.user.loginId,
        temporaryPassword: tempPassword,
      });

      return result;
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const target = (error.meta?.target as string[]) || [];
        if (target.includes("email") || target.includes("companyId_email")) {
          throw new ConflictError("Email already exists");
        }
        if (target.includes("phone")) {
          throw new ConflictError("Phone number already in use");
        }
        if (target.includes("loginId")) {
          throw new ConflictError("Login ID generation collision, try again.");
        }
      }
      throw error;
    }
  }

  async getEmployees(companyId: string, params: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: "asc" | "desc" }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    let where: Prisma.EmployeeWhereInput = { companyId };
    
    if (params.search) {
      where = {
        ...where,
        OR: [
          { firstName: { contains: params.search, mode: "insensitive" } },
          { lastName: { contains: params.search, mode: "insensitive" } },
          { user: { email: { contains: params.search, mode: "insensitive" } } },
          { user: { loginId: { contains: params.search, mode: "insensitive" } } },
        ],
      };
    }

    const orderBy: Prisma.EmployeeOrderByWithRelationInput = {};
    const sortField = params.sortBy || "createdAt";
    const sortOrder = params.sortOrder || "desc";
    
    if (["firstName", "createdAt", "dateOfJoining"].includes(sortField)) {
      orderBy[sortField as keyof Prisma.EmployeeOrderByWithRelationInput] = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          designation: true,
          department: true,
          employmentStatus: true,
          user: {
            select: {
              email: true,
              role: true,
              isActive: true,
            }
          }
        },
      }),
      prisma.employee.count({ where }),
    ]);

    return {
      data: employees.map(emp => ({
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`.trim(),
        email: emp.user.email,
        role: emp.user.role,
        designation: emp.designation,
        department: emp.department,
        status: emp.employmentStatus,
        isActive: emp.user.isActive,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  async getEmployeeById(companyId: string, id: string) {
    const employee = await prisma.employee.findFirst({
      where: { id, companyId },
      include: {
        user: {
          select: {
            loginId: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
          }
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    return employee;
  }

  async updateEmployee(companyId: string, id: string, data: Partial<Omit<CreateEmployeeInput, 'dateOfJoining' | 'companyId' | 'email' | 'role'>>) {
    // Only allow updating certain fields for now
    const employee = await prisma.employee.findFirst({
      where: { id, companyId },
    });

    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    if (data.managerId) {
      if (data.managerId === id) {
        throw new BadRequestError("Employee cannot be their own manager");
      }
      
      const manager = await prisma.employee.findFirst({
        where: { id: data.managerId, companyId },
        include: { user: true },
      });

      if (!manager) {
        throw new BadRequestError("Manager not found in this company");
      }
      if (!manager.user.isActive) {
        throw new BadRequestError("Manager is not active");
      }
    }

    try {
      const updatedEmployee = await prisma.employee.update({
        where: { id },
        data: {
          department: data.department !== undefined ? data.department : undefined,
          designation: data.designation !== undefined ? data.designation : undefined,
          phone: data.phone !== undefined ? data.phone : undefined,
          managerId: data.managerId !== undefined ? data.managerId : undefined,
          location: data.location !== undefined ? data.location : undefined,
        },
      });

      return updatedEmployee;
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("Phone number already in use");
      }
      throw error;
    }
  }

  async deactivateEmployee(companyId: string, id: string) {
    const employee = await prisma.employee.findFirst({
      where: { id, companyId },
    });

    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    // Atomic deactivation preserving historical data
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: employee.userId },
        data: { isActive: false },
      });

      await tx.employee.update({
        where: { id },
        data: { employmentStatus: "TERMINATED" },
      });
      
      // We could also terminate active sessions here
      await tx.session.deleteMany({
        where: { userId: employee.userId },
      });
    });

    return { message: "Employee deactivated successfully" };
  }
}
