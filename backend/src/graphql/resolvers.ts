import { GraphQLError } from "graphql";
import pool from "../db/pool.js";
import { AppError } from "../middleware/errorHandler.js";
import { JWTPayload } from "../types/auth.types.js";
import {
  createTicket,
  getTicketWithDetails,
  listTickets,
  updateTicketStatus,
  assignTicket,
  addComment,
  getTicketAnalytics,
  deleteTicket,
} from "../services/ticketService.js";
import { getStudentByPrn, listStudents } from "../services/studentService.js";
import { registerStudent, loginStudent } from "../services/authService.js";

export interface GraphQLContext {
  user?: JWTPayload;
}

function handleResolverError(err: unknown): never {
  if (err instanceof GraphQLError) {
    throw err;
  }
  if (err instanceof AppError) {
    let code = "BAD_USER_INPUT";
    if (err.statusCode === 401) code = "UNAUTHENTICATED";
    if (err.statusCode === 403) code = "FORBIDDEN";
    if (err.statusCode === 404) code = "NOT_FOUND";
    if (err.statusCode === 409) code = "CONFLICT";

    throw new GraphQLError(err.message, {
      extensions: { code, http: { status: err.statusCode } },
    });
  }
  const message = err instanceof Error ? err.message : "Internal server error";
  throw new GraphQLError(message, {
    extensions: { code: "INTERNAL_SERVER_ERROR", http: { status: 500 } },
  });
}

function formatDate(d: unknown): string | null {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString();
  return String(d);
}

export const resolvers = {
  Ticket: {
    sla_deadline: (t: any) => formatDate(t.sla_deadline),
    created_at: (t: any) => formatDate(t.created_at),
    updated_at: (t: any) => formatDate(t.updated_at),
    resolved_at: (t: any) => formatDate(t.resolved_at),
    comments: async (t: any) => {
      if (t.comments) return t.comments;
      const res = await pool.query(
        "SELECT * FROM ticket_comments WHERE ticket_id = $1 ORDER BY created_at ASC",
        [t.id]
      );
      return res.rows;
    },
    timeline: async (t: any) => {
      if (t.timeline) return t.timeline;
      const res = await pool.query(
        "SELECT * FROM ticket_activities WHERE ticket_id = $1 ORDER BY created_at ASC",
        [t.id]
      );
      return res.rows;
    },
    creator: async (t: any) => {
      if (!t.created_by) return null;
      try {
        return await getStudentByPrn(t.created_by);
      } catch {
        return null;
      }
    },
  },

  TicketComment: {
    created_at: (c: any) => formatDate(c.created_at),
  },

  TicketActivity: {
    created_at: (a: any) => formatDate(a.created_at),
  },

  Student: {
    created_at: (s: any) => formatDate(s.created_at),
  },

  Query: {
    me: (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      return context.user || null;
    },

    studentProfile: async (_parent: unknown, { prn }: { prn: string }) => {
      try {
        return await getStudentByPrn(prn);
      } catch (err) {
        handleResolverError(err);
      }
    },

    students: async (
      _parent: unknown,
      { department }: { department?: string }
    ) => {
      try {
        return await listStudents(department);
      } catch (err) {
        handleResolverError(err);
      }
    },

    ticket: async (_parent: unknown, { id }: { id: string }) => {
      try {
        return await getTicketWithDetails(id);
      } catch (err) {
        handleResolverError(err);
      }
    },

    tickets: async (
      _parent: unknown,
      args: {
        status?: any;
        category?: any;
        department_routing?: string;
        created_by?: string;
        assigned_to?: string;
        sla_breached?: boolean;
        limit?: number;
        offset?: number;
      }
    ) => {
      try {
        const res = await listTickets({
          status: args.status,
          category: args.category,
          department_routing: args.department_routing,
          created_by: args.created_by,
          assigned_to: args.assigned_to,
          sla_breached: args.sla_breached,
          limit: args.limit,
          offset: args.offset,
        });
        return res;
      } catch (err) {
        handleResolverError(err);
      }
    },

    ticketAnalytics: async () => {
      try {
        const analytics = await getTicketAnalytics();
        return {
          total: analytics.total,
          open: analytics.open,
          in_progress: analytics.in_progress,
          resolved: analytics.resolved,
          closed: analytics.closed,
          sla_breached: analytics.sla_breached,
          by_category: Object.entries(analytics.by_category).map(
            ([category, count]) => ({
              category,
              count,
            })
          ),
          by_priority: Object.entries(analytics.by_priority).map(
            ([priority, count]) => ({
              priority,
              count,
            })
          ),
        };
      } catch (err) {
        handleResolverError(err);
      }
    },
  },

  Mutation: {
    registerStudent: async (
      _parent: unknown,
      { input }: { input: any }
    ) => {
      try {
        return await registerStudent(input);
      } catch (err) {
        handleResolverError(err);
      }
    },

    login: async (_parent: unknown, { input }: { input: any }) => {
      try {
        return await loginStudent(input);
      } catch (err) {
        handleResolverError(err);
      }
    },

    createTicket: async (
      _parent: unknown,
      { input }: { input: any },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new GraphQLError("Authentication required to raise a ticket", {
          extensions: { code: "UNAUTHENTICATED", http: { status: 401 } },
        });
      }
      try {
        return await createTicket(input, context.user);
      } catch (err) {
        handleResolverError(err);
      }
    },

    updateTicketStatus: async (
      _parent: unknown,
      {
        id,
        status,
        notes,
      }: { id: string; status: any; notes?: string },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED", http: { status: 401 } },
        });
      }
      try {
        return await updateTicketStatus(id, status, context.user, notes);
      } catch (err) {
        handleResolverError(err);
      }
    },

    assignTicket: async (
      _parent: unknown,
      {
        id,
        assignedTo,
        notes,
      }: { id: string; assignedTo: string; notes?: string },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED", http: { status: 401 } },
        });
      }
      try {
        return await assignTicket(id, assignedTo, context.user, notes);
      } catch (err) {
        handleResolverError(err);
      }
    },

    addComment: async (
      _parent: unknown,
      {
        ticketId,
        comment,
      }: { ticketId: string; comment: string },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new GraphQLError("Authentication required to post comments", {
          extensions: { code: "UNAUTHENTICATED", http: { status: 401 } },
        });
      }
      try {
        return await addComment(ticketId, comment, context.user);
      } catch (err) {
        handleResolverError(err);
      }
    },

    deleteTicket: async (
      _parent: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED", http: { status: 401 } },
        });
      }
      if (context.user.role !== "admin") {
        throw new GraphQLError("Only administrators can delete tickets", {
          extensions: { code: "FORBIDDEN", http: { status: 403 } },
        });
      }
      try {
        return await deleteTicket(id);
      } catch (err) {
        handleResolverError(err);
      }
    },
  },
};
