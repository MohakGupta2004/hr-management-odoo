import { prisma } from "../../db/prisma";
import { IdentityService } from "../identity/identity.service";
import { addWelcomeEmailToQueue } from "../email/email.queue";
import { ConflictError, BadRequestError, NotFoundError } from "../../utils/errors";
import bcrypt from "bcrypt";
import { Prisma } from "../../../generated/prisma/client";
import fs from "fs";
import path from "path";
import { uploadToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } from "../../utils/cloudinary";

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

const EMPLOYEE_DETAIL_INCLUDE = {
  user: {
    select: {
      loginId: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
    },
  },
  manager: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  skills: {
    select: {
      id: true,
      name: true,
    },
  },
  certifications: {
    select: {
      id: true,
      name: true,
      issuedBy: true,
      issuedAt: true,
      fileUrl: true,
    },
  },
  documents: {
    select: {
      id: true,
      title: true,
      fileUrl: true,
      uploadedAt: true,
    },
  },
} satisfies Prisma.EmployeeInclude;

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
      include: EMPLOYEE_DETAIL_INCLUDE,
    });

    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    return employee;
  }

  async getMyProfile(companyId: string, userId: string) {
    const employee = await prisma.employee.findFirst({
      where: { userId, companyId },
      include: EMPLOYEE_DETAIL_INCLUDE,
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

  async addSkill(companyId: string, employeeId: string, name: string) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId },
    });

    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    try {
      const skill = await prisma.skill.create({
        data: {
          employeeId,
          name,
        },
        select: {
          id: true,
          name: true,
        },
      });
      return skill;
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("Skill already added to this employee");
      }
      throw error;
    }
  }

  async removeSkill(companyId: string, employeeId: string, skillId: string) {
    const skill = await prisma.skill.findFirst({
      where: {
        id: skillId,
        employeeId,
        employee: { companyId },
      },
    });

    if (!skill) {
      throw new NotFoundError("Skill not found");
    }

    await prisma.skill.delete({
      where: { id: skillId },
    });

    return { message: "Skill removed successfully" };
  }

  async addCertification(companyId: string, employeeId: string, data: { name: string; issuedBy: string; issuedAt: Date; fileBuffer?: Buffer }) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId },
    });

    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    let fileUrl: string | undefined;
    if (data.fileBuffer) {
      const uploadResult = await uploadToCloudinary(data.fileBuffer, `employees/${employeeId}/certifications`);
      fileUrl = uploadResult.secure_url;
    }

    const certification = await prisma.certification.create({
      data: {
        employeeId,
        name: data.name,
        issuedBy: data.issuedBy,
        issuedAt: data.issuedAt,
        fileUrl,
      },
      select: {
        id: true,
        name: true,
        issuedBy: true,
        issuedAt: true,
        fileUrl: true,
      },
    });
    return certification;
  }

  async removeCertification(companyId: string, employeeId: string, certId: string) {
    const cert = await prisma.certification.findFirst({
      where: {
        id: certId,
        employeeId,
        employee: { companyId },
      },
    });

    if (!cert) {
      throw new NotFoundError("Certification not found");
    }

    if (cert.fileUrl) {
      const publicId = getPublicIdFromUrl(cert.fileUrl);
      if (publicId) {
        await deleteFromCloudinary(publicId).catch((err) => {
          console.error(`Failed to delete certification file from Cloudinary: ${publicId}`, err);
        });
      }
    }

    await prisma.certification.delete({
      where: { id: certId },
    });

    return { message: "Certification removed successfully" };
  }

  async addDocument(companyId: string, employeeId: string, data: { title: string; fileBuffer: Buffer }) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId },
    });

    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    // Upload to Cloudinary folder specific to employee
    const uploadResult = await uploadToCloudinary(data.fileBuffer, `employees/${employeeId}/documents`);

    const document = await prisma.document.create({
      data: {
        employeeId,
        title: data.title,
        fileUrl: uploadResult.secure_url,
      },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        uploadedAt: true,
      },
    });
    return document;
  }

  async getDocuments(companyId: string, employeeId: string) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId },
    });

    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    const docs = await prisma.document.findMany({
      where: { employeeId },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        uploadedAt: true,
      },
      orderBy: { uploadedAt: "desc" },
    });
    return docs;
  }

  async removeDocument(companyId: string, employeeId: string, docId: string) {
    const doc = await prisma.document.findFirst({
      where: {
        id: docId,
        employeeId,
        employee: { companyId },
      },
    });

    if (!doc) {
      throw new NotFoundError("Document not found");
    }

    // Extract Cloudinary public ID and delete from Cloudinary remote storage
    const publicId = getPublicIdFromUrl(doc.fileUrl);
    if (publicId) {
      await deleteFromCloudinary(publicId).catch((err) => {
        console.error(`Failed to delete file from Cloudinary: ${publicId}`, err);
      });
    }

    await prisma.document.delete({
      where: { id: docId },
    });

    return { message: "Document removed successfully" };
  }
}
