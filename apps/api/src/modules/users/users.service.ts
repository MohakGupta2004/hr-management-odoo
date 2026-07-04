import { prisma } from "../../db/prisma";
import type { Prisma } from "../../../generated/prisma/client";

export class UsersService {
  async findAll() {
    return prisma.user.findMany({
      select: {
        id: true,
        loginId: true,
        email: true,
      },
    });
  }

  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data,
      select: {
        id: true,
        loginId: true,
        email: true,
      },
    });
  }
}
