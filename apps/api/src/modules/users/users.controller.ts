import type { Request, Response, NextFunction } from "express";
import { UsersService } from "./users.service";

export class UsersController {
  private usersService = new UsersService();

  findAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await this.usersService.findAll();
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { loginId, email, password, companyId } = req.body;
      if (!loginId || !email || !password || !companyId) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const passwordHash = await Bun.password.hash(password);
      const user = await this.usersService.create({
        loginId,
        email,
        passwordHash,
        company: { connect: { id: companyId } },
      });
      res.status(201).json(user);
    } catch (error: any) {
      if (error.code === "P2002") {
        return res.status(409).json({ error: "User already exists" });
      }
      next(error);
    }
  };
}
