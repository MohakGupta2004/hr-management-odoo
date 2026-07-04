import { Router } from "express";
import { UsersController } from "./users.controller";

const router = Router();
const controller = new UsersController();

router.get("/", controller.findAll);
router.post("/", controller.create);

export const usersRouter = router;
