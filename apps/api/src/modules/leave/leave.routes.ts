import { Router } from "express";
import { LeaveController } from "./leave.controller";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

export const leaveRouter = Router();
const leaveController = new LeaveController();

leaveRouter.use(requireAuth);

// ---- Employee self-service ----
leaveRouter.post("/", leaveController.applyLeave);
leaveRouter.get("/me", leaveController.getMyLeaves);
leaveRouter.get("/allocations/me", leaveController.getMyAllocations);

// ---- Admin (HR) only ---- (literal paths before "/:id/..." param routes)
leaveRouter.post("/allocations", requireRole(["ADMIN"]), leaveController.allocateLeave);
leaveRouter.get("/allocations/:employeeId", requireRole(["ADMIN"]), leaveController.getEmployeeAllocations);
leaveRouter.get("/pending", requireRole(["ADMIN"]), leaveController.getPendingLeaves);
leaveRouter.get("/", requireRole(["ADMIN"]), leaveController.listLeaves);
leaveRouter.patch("/:id/approve", requireRole(["ADMIN"]), leaveController.approveLeave);
leaveRouter.patch("/:id/reject", requireRole(["ADMIN"]), leaveController.rejectLeave);
