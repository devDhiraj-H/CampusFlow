import { Request, Response, NextFunction } from "express";
import * as ticketService from "../services/ticketService.js";
import { AppError } from "../middleware/errorHandler.js";
import { TicketCategory, TicketStatus } from "../types/ticket.types.js";

function extractParamId(param: string | string[] | undefined): string {
  if (typeof param === "string") return param;
  if (Array.isArray(param) && param.length > 0) return param[0];
  throw new AppError("Invalid or missing resource ID parameter", 400);
}

export async function createTicket(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("Authentication required to raise a ticket", 401);
    }
    const ticket = await ticketService.createTicket(req.body, req.user);
    res.status(201).json({
      success: true,
      message: "Ticket created and routed successfully",
      data: ticket,
    });
  } catch (err) {
    next(err);
  }
}

export async function getTicketById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = extractParamId(req.params.id);
    const ticket = await ticketService.getTicketWithDetails(id);
    res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (err) {
    next(err);
  }
}

export async function listTickets(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { status, category, department_routing, created_by, assigned_to, sla_breached, limit, offset } = req.query;

    const result = await ticketService.listTickets({
      status: status as TicketStatus,
      category: category as TicketCategory,
      department_routing: department_routing as string,
      created_by: created_by as string,
      assigned_to: assigned_to as string,
      sla_breached: sla_breached === "true",
      limit: limit ? parseInt(limit as string, 10) : 20,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });

    res.status(200).json({
      success: true,
      data: result.tickets,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit as string, 10) : 20,
        offset: offset ? parseInt(offset as string, 10) : 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateTicketStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }
    const id = extractParamId(req.params.id);
    const { status, notes } = req.body;
    if (!status) {
      throw new AppError("Target status is required", 400);
    }
    const updated = await ticketService.updateTicketStatus(id, status as TicketStatus, req.user, notes);
    res.status(200).json({
      success: true,
      message: `Ticket transitioned to ${status}`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function assignTicket(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }
    const id = extractParamId(req.params.id);
    const { assigned_to, notes } = req.body;
    if (!assigned_to) {
      throw new AppError("assigned_to field is required", 400);
    }
    const updated = await ticketService.assignTicket(id, assigned_to, req.user, notes);
    res.status(200).json({
      success: true,
      message: `Ticket assigned to ${assigned_to}`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function addComment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }
    const id = extractParamId(req.params.id);
    const { comment } = req.body;
    const createdComment = await ticketService.addComment(id, comment, req.user);
    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: createdComment,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAnalytics(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const analytics = await ticketService.getTicketAnalytics();
    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteTicket(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = extractParamId(req.params.id);
    await ticketService.deleteTicket(id);
    res.status(200).json({
      success: true,
      message: "Ticket deleted successfully",
    });
  } catch (err) {
    next(err);
  }
}
