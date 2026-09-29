import { TicketStatus } from "../types/ticket.types.js";
import { UserRole } from "../types/auth.types.js";
import { AppError } from "../middleware/errorHandler.js";

const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS", "CLOSED"],
  IN_PROGRESS: ["RESOLVED", "OPEN"],
  RESOLVED: ["CLOSED", "OPEN"],
  CLOSED: [], // Terminal state
};

export function validateStateTransition(
  currentStatus: TicketStatus,
  targetStatus: TicketStatus,
  userRole: UserRole,
  isCreator: boolean
): void {
  if (currentStatus === targetStatus) {
    throw new AppError(`Ticket is already in state '${currentStatus}'`, 400);
  }

  const allowedNextStates = VALID_TRANSITIONS[currentStatus];
  if (!allowedNextStates || !allowedNextStates.includes(targetStatus)) {
    throw new AppError(
      `Illegal transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: [${allowedNextStates.join(
        ", "
      )}]`,
      400
    );
  }

  // Permission rules:
  // 1. Terminal closing: creator can cancel OPEN tickets to CLOSED; staff/admin can close RESOLVED tickets
  if (targetStatus === "CLOSED") {
    if (currentStatus === "OPEN" && !isCreator && userRole === "student") {
      throw new AppError("Only the ticket creator or staff can cancel this ticket", 403);
    }
  }

  // 2. Setting to IN_PROGRESS: Only staff/admin
  if (targetStatus === "IN_PROGRESS") {
    if (userRole === "student") {
      throw new AppError("Students cannot move tickets to IN_PROGRESS", 403);
    }
  }

  // 3. Setting to RESOLVED: Only staff/admin/faculty
  if (targetStatus === "RESOLVED") {
    if (userRole === "student") {
      throw new AppError("Only assigned department staff can mark a ticket as RESOLVED", 403);
    }
  }

  // 4. Reopening (from RESOLVED back to OPEN): creator or admin
  if (currentStatus === "RESOLVED" && targetStatus === "OPEN") {
    if (!isCreator && userRole === "student") {
      throw new AppError("Only the original student creator can reopen a resolved ticket", 403);
    }
  }
}
