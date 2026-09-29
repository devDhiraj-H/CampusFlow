export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TicketCategory =
  | "HOSTEL"
  | "ACADEMIC"
  | "MAINTENANCE"
  | "FINANCE"
  | "GENERAL";

export type DepartmentRouting =
  | "FACILITIES_HOSTEL"
  | "ACADEMIC_OFFICE"
  | "FINANCE_OFFICE"
  | "IT_INFRASTRUCTURE"
  | "GENERAL_ADMIN";

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  department_routing: string;
  sla_deadline: Date;
  is_sla_breached: boolean;
  created_by: string; // student PRN
  assigned_to: string | null;
  resolved_by: string | null;
  resolved_at: Date | null;
  resolution_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_id: string;
  author_role: string;
  author_name?: string;
  comment: string;
  created_at: Date;
}

export interface TicketActivity {
  id: string;
  ticket_id: string;
  actor: string;
  action: string;
  from_status?: string | null;
  to_status?: string | null;
  notes?: string | null;
  created_at: Date;
}

export interface TicketWithDetails extends Ticket {
  comments: TicketComment[];
  timeline: TicketActivity[];
}

export interface CreateTicketDTO {
  title: string;
  description: string;
  category?: TicketCategory;
  priority?: TicketPriority;
}

export interface UpdateTicketStatusDTO {
  status: TicketStatus;
  notes?: string;
}

export interface AssignTicketDTO {
  assigned_to: string;
  notes?: string;
}

export interface AddCommentDTO {
  comment: string;
}

export interface TicketFilterDTO {
  status?: TicketStatus;
  category?: TicketCategory;
  department_routing?: string;
  created_by?: string;
  assigned_to?: string;
  sla_breached?: boolean;
  limit?: number;
  offset?: number;
}

export interface TicketAnalytics {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  sla_breached: number;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
}
