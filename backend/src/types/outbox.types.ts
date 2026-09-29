export interface OutboxEvent {
  id: string;
  aggregate_type: "TICKET" | "STUDENT" | "AUTH";
  aggregate_id: string;
  event_type: "TICKET_CREATED" | "TICKET_UPDATED" | "TICKET_ASSIGNED" | "TICKET_RESOLVED" | "STUDENT_REGISTERED";
  payload: Record<string, unknown>;
  created_at: Date;
  processed: boolean;
  processed_at?: Date | null;
}
