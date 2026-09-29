import { TicketPriority, TicketStatus } from "../types/ticket.types.js";

const SLA_HOURS_MAP: Record<TicketPriority, number> = {
  URGENT: 6,
  HIGH: 24,
  MEDIUM: 48,
  LOW: 120, // 5 days
};

export function calculateSlaDeadline(
  priority: TicketPriority = "MEDIUM",
  baseDate: Date = new Date()
): Date {
  const hours = SLA_HOURS_MAP[priority] || 48;
  const deadline = new Date(baseDate.getTime() + hours * 60 * 60 * 1000);
  return deadline;
}

export function isSlaBreached(deadline: Date, status: TicketStatus): boolean {
  if (status === "RESOLVED" || status === "CLOSED") {
    return false;
  }
  return new Date() > new Date(deadline);
}
