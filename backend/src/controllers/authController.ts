import { Request, Response, NextFunction } from "express";
import * as authService from "../services/authService.js";
import { AppError } from "../middleware/errorHandler.js";

export async function registerStudent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await authService.registerStudent(req.body);
    res.status(201).json({
      success: true,
      message: "Student registered successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function loginStudent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await authService.loginStudent(req.body);
    res.status(200).json({
      success: true,
      message: "Login successful",
      token: result.token,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
}

export async function getStudentDashboard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }
    const profile = await authService.getStudentProfileByAuthId(req.user.auth_id);
    res.status(200).json({
      success: true,
      message: "Welcome to CampusFlow secure student dashboard",
      data: {
        user: req.user,
        profile,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }
    const profile = await authService.getStudentProfileByAuthId(req.user.auth_id);
    if (!profile) {
      throw new AppError("Student profile not found", 404);
    }
    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (err) {
    next(err);
  }
}
