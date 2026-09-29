import { TicketCategory } from "../types/ticket.types.js";

export function determineDepartmentRouting(
  category: TicketCategory,
  studentDepartment?: string
): string {
  switch (category) {
    case "HOSTEL":
      return "FACILITIES_HOSTEL";
    case "ACADEMIC":
      return studentDepartment
        ? `ACADEMIC_${studentDepartment.toUpperCase().replace(/\s+/g, "_")}`
        : "ACADEMIC_OFFICE";
    case "FINANCE":
      return "FINANCE_OFFICE";
    case "MAINTENANCE":
      return "IT_INFRASTRUCTURE";
    case "GENERAL":
    default:
      return "GENERAL_ADMIN";
  }
}
