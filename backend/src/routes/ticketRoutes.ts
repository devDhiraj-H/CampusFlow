import { Router } from "express";
import {
  createTicket,
  getTicketById,
  listTickets,
  updateTicketStatus,
  assignTicket,
  addComment,
  getAnalytics,
  deleteTicket,
} from "../controllers/ticketController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = Router();

// Operational metrics & analytics (placed before /:id)
router.get("/analytics", getAnalytics);

// Ticket query endpoints
router.get("/", listTickets);
router.get("/:id", getTicketById);

// Protected actions
router.post("/", authenticateToken, createTicket);
router.patch("/:id/status", authenticateToken, updateTicketStatus);
router.patch("/:id/assign", authenticateToken, assignTicket);
router.post("/:id/comments", authenticateToken, addComment);
router.delete("/:id", authenticateToken, deleteTicket);

export default router;
