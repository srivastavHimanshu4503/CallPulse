import { Request, Response } from "express";
import { bookingsService } from "./bookings.service.js";
import { updateBookingSchema } from "@antigravity/validators";

export const bookingsController = {
  async getBookings(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      const bookings = await bookingsService.getBookings(tenantId);
      res.json({ success: true, data: bookings, error: null });
    } catch (error: any) {
      res.status(500).json({ success: false, data: null, error: error.message });
    }
  },

  async getTeamMembers(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      const members = await bookingsService.getTeamMembers(tenantId);
      res.json({ success: true, data: members, error: null });
    } catch (error: any) {
      res.status(500).json({ success: false, data: null, error: error.message });
    }
  },

  async updateBooking(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: "Booking ID required" });
        return;
      }
      const parsed = updateBookingSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          data: null,
          error: "Invalid input",
          details: parsed.error.issues,
        });
        return;
      }

      const updated = await bookingsService.updateBooking(tenantId, id, parsed.data);
      res.json({ success: true, data: updated, error: null });
    } catch (error: any) {
      res.status(500).json({ success: false, data: null, error: error.message });
    }
  },
};
