import { Router } from "express";
import { EmployeeController } from "./employee.controller";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

export const employeeRouter = Router();
const employeeController = new EmployeeController();

employeeRouter.use(requireAuth);
employeeRouter.use(requireRole(["ADMIN"])); // Admin only routes for now

employeeRouter.post("/", employeeController.createEmployee);
employeeRouter.get("/", employeeController.getEmployees);
employeeRouter.get("/:id", employeeController.getEmployeeById);
employeeRouter.patch("/:id", employeeController.updateEmployee);
employeeRouter.delete("/:id", employeeController.deactivateEmployee);
