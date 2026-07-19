import { Router } from "express";
import { bookingsController } from "./bookings.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { tenantMiddleware } from "../../middleware/tenant.middleware.js";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/", bookingsController.getBookings);
router.get("/team-members", bookingsController.getTeamMembers);
router.patch("/:id", bookingsController.updateBooking);

export { router as bookingsRouter };
