import pool from "../db/pool.js";
import {
  Ticket,
  TicketWithDetails,
  CreateTicketDTO,
  TicketFilterDTO,
  TicketStatus,
  TicketAnalytics,
  TicketComment,
  TicketActivity,
} from "../types/ticket.types.js";
import { JWTPayload } from "../types/auth.types.js";
import { AppError } from "../middleware/errorHandler.js";
import { calculateSlaDeadline, isSlaBreached } from "../utils/slaCalculator.js";
import { determineDepartmentRouting } from "../utils/autoRouter.js";
import { validateStateTransition } from "../utils/stateMachine.js";

export async function createTicket(
  data: CreateTicketDTO,
  user: JWTPayload
): Promise<Ticket> {
  const { title, description, category = "GENERAL", priority = "MEDIUM" } = data;

  if (!title || !description) {
    throw new AppError("Ticket title and description are required", 400);
  }

  const creatorPrn = user.prn || user.email;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Inter-service gRPC call: Validate student eligibility via binary RPC
    let studentDept: string | undefined;
    if (user.role === "student" && user.prn) {
      try {
        const { getStudentGrpcClient } = await import("../grpc/studentClient.js");
        const grpcClient = getStudentGrpcClient();
        const rpcResult = await grpcClient.validateEligibility(user.prn, category);
        if (!rpcResult.is_eligible) {
          throw new AppError(rpcResult.reason || "Student eligibility validation failed", 403);
        }
        studentDept = rpcResult.department;
      } catch (err: any) {
        if (err instanceof AppError) throw err;
        console.warn("[gRPC Fallback] Student RPC call failed, falling back to direct DB verification:", err.message);
        const studentRes = await client.query(
          "SELECT department, hosteller FROM students WHERE prn = $1",
          [user.prn]
        );
        if (studentRes.rows.length > 0) {
          const student = studentRes.rows[0];
          studentDept = student.department;
          if (category === "HOSTEL" && !student.hosteller) {
            throw new AppError(
              "Access Denied: Only registered hostel residents can raise hostel maintenance requests.",
              403
            );
          }
        }
      }
    }

    // 2. Compute SLA Deadline and Department Routing
    const slaDeadline = calculateSlaDeadline(priority);
    const departmentRouting = determineDepartmentRouting(category, studentDept);

    // 3. Insert Ticket
    const ticketQuery = `
      INSERT INTO tickets (
        title, description, category, priority, status,
        department_routing, sla_deadline, is_sla_breached,
        created_by, updated_at
      )
      VALUES ($1, $2, $3, $4, 'OPEN', $5, $6, FALSE, $7, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const ticketRes = await client.query(ticketQuery, [
      title,
      description,
      category,
      priority,
      departmentRouting,
      slaDeadline,
      creatorPrn,
    ]);
    const createdTicket: Ticket = ticketRes.rows[0];

    // 4. Record Initial Timeline Activity
    const activityQuery = `
      INSERT INTO ticket_activities (ticket_id, actor, action, to_status, notes)
      VALUES ($1, $2, 'CREATED', 'OPEN', $3)
    `;
    await client.query(activityQuery, [
      createdTicket.id,
      creatorPrn,
      `Ticket raised and routed to ${departmentRouting} with ${priority} priority.`,
    ]);

    // 5. Transactional Outbox Pattern: Save Event Atomically
    const outboxQuery = `
      INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
      VALUES ('TICKET', $1, 'TICKET_CREATED', $2)
    `;
    const outboxPayload = JSON.stringify({
      ticket_id: createdTicket.id,
      title: createdTicket.title,
      category: createdTicket.category,
      priority: createdTicket.priority,
      department_routing: departmentRouting,
      sla_deadline: slaDeadline.toISOString(),
      created_by: creatorPrn,
      created_at: createdTicket.created_at,
    });
    await client.query(outboxQuery, [createdTicket.id, outboxPayload]);

    await client.query("COMMIT");
    return createdTicket;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getTicketById(id: string): Promise<Ticket> {
  const res = await pool.query("SELECT * FROM tickets WHERE id = $1", [id]);
  if (res.rows.length === 0) {
    throw new AppError(`Ticket with ID ${id} not found`, 404);
  }
  const ticket: Ticket = res.rows[0];
  ticket.is_sla_breached = isSlaBreached(ticket.sla_deadline, ticket.status);
  return ticket;
}

export async function getTicketWithDetails(id: string): Promise<TicketWithDetails> {
  const ticket = await getTicketById(id);

  const commentsRes = await pool.query(
    "SELECT * FROM ticket_comments WHERE ticket_id = $1 ORDER BY created_at ASC",
    [id]
  );
  const activitiesRes = await pool.query(
    "SELECT * FROM ticket_activities WHERE ticket_id = $1 ORDER BY created_at ASC",
    [id]
  );

  return {
    ...ticket,
    comments: commentsRes.rows as TicketComment[],
    timeline: activitiesRes.rows as TicketActivity[],
  };
}

export async function listTickets(filters: TicketFilterDTO = {}): Promise<{
  total: number;
  tickets: Ticket[];
}> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  if (filters.category) {
    values.push(filters.category);
    conditions.push(`category = $${values.length}`);
  }
  if (filters.department_routing) {
    values.push(filters.department_routing);
    conditions.push(`department_routing = $${values.length}`);
  }
  if (filters.created_by) {
    values.push(filters.created_by);
    conditions.push(`created_by = $${values.length}`);
  }
  if (filters.assigned_to) {
    values.push(filters.assigned_to);
    conditions.push(`assigned_to = $${values.length}`);
  }
  if (filters.sla_breached) {
    conditions.push(`sla_deadline < CURRENT_TIMESTAMP AND status NOT IN ('RESOLVED', 'CLOSED')`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const countRes = await pool.query(`SELECT COUNT(*) FROM tickets ${whereClause}`, values);
  const total = parseInt(countRes.rows[0].count, 10);

  const limit = filters.limit || 20;
  const offset = filters.offset || 0;

  values.push(limit);
  const limitIndex = values.length;
  values.push(offset);
  const offsetIndex = values.length;

  const dataRes = await pool.query(
    `SELECT * FROM tickets ${whereClause} ORDER BY created_at DESC LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    values
  );

  const tickets = dataRes.rows.map((t: Ticket) => ({
    ...t,
    is_sla_breached: isSlaBreached(t.sla_deadline, t.status),
  }));

  return { total, tickets };
}

export async function updateTicketStatus(
  id: string,
  targetStatus: TicketStatus,
  user: JWTPayload,
  notes?: string
): Promise<Ticket> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existingRes = await client.query(
      "SELECT * FROM tickets WHERE id = $1 FOR UPDATE",
      [id]
    );
    if (existingRes.rows.length === 0) {
      throw new AppError(`Ticket with ID ${id} not found`, 404);
    }
    const currentTicket: Ticket = existingRes.rows[0];

    // Enforce strict state machine transitions and role rules
    const isCreator =
      (user.prn && user.prn === currentTicket.created_by) ||
      user.email === currentTicket.created_by;

    validateStateTransition(currentTicket.status, targetStatus, user.role, Boolean(isCreator));

    // Resolve details if moving to RESOLVED
    const isResolving = targetStatus === "RESOLVED";
    const resolvedBy = isResolving ? user.name || user.email : currentTicket.resolved_by;
    const resolvedAt = isResolving ? new Date() : currentTicket.resolved_at;
    const resolutionNotes = isResolving ? notes || currentTicket.resolution_notes : currentTicket.resolution_notes;

    const updateQuery = `
      UPDATE tickets
      SET
        status = $2,
        resolved_by = $3,
        resolved_at = $4,
        resolution_notes = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const res = await client.query(updateQuery, [
      id,
      targetStatus,
      resolvedBy,
      resolvedAt,
      resolutionNotes,
    ]);
    const updatedTicket: Ticket = res.rows[0];

    // Record Activity
    const activityQuery = `
      INSERT INTO ticket_activities (ticket_id, actor, action, from_status, to_status, notes)
      VALUES ($1, $2, 'STATUS_CHANGED', $3, $4, $5)
    `;
    await client.query(activityQuery, [
      id,
      user.name || user.email,
      currentTicket.status,
      targetStatus,
      notes || null,
    ]);

    // Outbox Event
    const eventType = targetStatus === "RESOLVED" ? "TICKET_RESOLVED" : "TICKET_STATUS_UPDATED";
    const outboxQuery = `
      INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
      VALUES ('TICKET', $1, $2, $3)
    `;
    const payload = JSON.stringify({
      ticket_id: id,
      previous_status: currentTicket.status,
      new_status: targetStatus,
      actor: user.name || user.email,
      notes: notes || null,
      updated_at: updatedTicket.updated_at,
    });
    await client.query(outboxQuery, [id, eventType, payload]);

    await client.query("COMMIT");
    return updatedTicket;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function assignTicket(
  id: string,
  assignedTo: string,
  user: JWTPayload,
  notes?: string
): Promise<Ticket> {
  if (user.role === "student") {
    throw new AppError("Only staff or administrators can assign tickets", 403);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existingRes = await client.query("SELECT * FROM tickets WHERE id = $1 FOR UPDATE", [id]);
    if (existingRes.rows.length === 0) {
      throw new AppError(`Ticket with ID ${id} not found`, 404);
    }
    const currentTicket: Ticket = existingRes.rows[0];

    // If ticket is still OPEN, auto-transition to IN_PROGRESS upon assignment
    const nextStatus: TicketStatus = currentTicket.status === "OPEN" ? "IN_PROGRESS" : currentTicket.status;

    const updateQuery = `
      UPDATE tickets
      SET assigned_to = $2, status = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const res = await client.query(updateQuery, [id, assignedTo, nextStatus]);
    const updatedTicket: Ticket = res.rows[0];

    // Record Activity
    const activityQuery = `
      INSERT INTO ticket_activities (ticket_id, actor, action, from_status, to_status, notes)
      VALUES ($1, $2, 'ASSIGNED', $3, $4, $5)
    `;
    await client.query(activityQuery, [
      id,
      user.name || user.email,
      currentTicket.status,
      nextStatus,
      notes || `Assigned to ${assignedTo}`,
    ]);

    // Outbox Event
    const outboxQuery = `
      INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
      VALUES ('TICKET', $1, 'TICKET_ASSIGNED', $2)
    `;
    const payload = JSON.stringify({
      ticket_id: id,
      assigned_to: assignedTo,
      assigned_by: user.name || user.email,
      status: nextStatus,
    });
    await client.query(outboxQuery, [id, payload]);

    await client.query("COMMIT");
    return updatedTicket;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function addComment(
  id: string,
  commentText: string,
  user: JWTPayload
): Promise<TicketComment> {
  if (!commentText || commentText.trim().length === 0) {
    throw new AppError("Comment text cannot be empty", 400);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existingRes = await client.query("SELECT id FROM tickets WHERE id = $1", [id]);
    if (existingRes.rows.length === 0) {
      throw new AppError(`Ticket with ID ${id} not found`, 404);
    }

    const commentQuery = `
      INSERT INTO ticket_comments (ticket_id, author_id, author_role, author_name, comment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const commentRes = await client.query(commentQuery, [
      id,
      user.prn || user.email,
      user.role,
      user.name || user.email,
      commentText.trim(),
    ]);
    const createdComment: TicketComment = commentRes.rows[0];

    // Activity log
    const activityQuery = `
      INSERT INTO ticket_activities (ticket_id, actor, action, notes)
      VALUES ($1, $2, 'COMMENT_ADDED', $3)
    `;
    await client.query(activityQuery, [
      id,
      user.name || user.email,
      `Added comment: "${commentText.slice(0, 60)}${commentText.length > 60 ? "..." : ""}"`,
    ]);

    // Outbox Event
    const outboxQuery = `
      INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
      VALUES ('TICKET', $1, 'TICKET_COMMENT_ADDED', $2)
    `;
    await client.query(outboxQuery, [
      id,
      JSON.stringify({
        ticket_id: id,
        comment_id: createdComment.id,
        author: user.name || user.email,
        role: user.role,
      }),
    ]);

    await client.query("COMMIT");
    return createdComment;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getTicketAnalytics(): Promise<TicketAnalytics> {
  const query = `
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'OPEN') AS open,
      COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress,
      COUNT(*) FILTER (WHERE status = 'RESOLVED') AS resolved,
      COUNT(*) FILTER (WHERE status = 'CLOSED') AS closed,
      COUNT(*) FILTER (WHERE sla_deadline < CURRENT_TIMESTAMP AND status NOT IN ('RESOLVED', 'CLOSED')) AS sla_breached
    FROM tickets
  `;
  const summaryRes = await pool.query(query);
  const row = summaryRes.rows[0];

  const catRes = await pool.query(
    "SELECT category, COUNT(*) as count FROM tickets GROUP BY category"
  );
  const byCategory: Record<string, number> = {};
  catRes.rows.forEach((r) => {
    byCategory[r.category] = parseInt(r.count, 10);
  });

  const prioRes = await pool.query(
    "SELECT priority, COUNT(*) as count FROM tickets GROUP BY priority"
  );
  const byPriority: Record<string, number> = {};
  prioRes.rows.forEach((r) => {
    byPriority[r.priority] = parseInt(r.count, 10);
  });

  return {
    total: parseInt(row.total, 10) || 0,
    open: parseInt(row.open, 10) || 0,
    in_progress: parseInt(row.in_progress, 10) || 0,
    resolved: parseInt(row.resolved, 10) || 0,
    closed: parseInt(row.closed, 10) || 0,
    sla_breached: parseInt(row.sla_breached, 10) || 0,
    by_category: byCategory,
    by_priority: byPriority,
  };
}

export async function deleteTicket(id: string): Promise<boolean> {
  const res = await pool.query("DELETE FROM tickets WHERE id = $1 RETURNING id", [id]);
  if (res.rows.length === 0) {
    throw new AppError(`Ticket with ID ${id} not found`, 404);
  }
  return true;
}
