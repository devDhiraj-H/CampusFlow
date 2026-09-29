import { Request, Response, NextFunction } from "express";
import * as studentService from "../services/studentService.js";
import { AppError } from "../middleware/errorHandler.js";

export async function getStudentByPrn(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const prn = typeof req.params.prn === "string" ? req.params.prn : req.params.prn?.[0];
    if (!prn) {
      throw new AppError("Student PRN is required", 400);
    }
    const student = await studentService.getStudentByPrn(prn);
    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (err) {
    next(err);
  }
}

export async function listStudents(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { department } = req.query;
    const students = await studentService.listStudents(department as string | undefined);
    res.status(200).json({
      success: true,
      data: students,
    });
  } catch (err) {
    next(err);
  }
}

export async function validateStudent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const prn = typeof req.params.prn === "string" ? req.params.prn : req.params.prn?.[0];
    if (!prn) {
      throw new AppError("Student PRN is required", 400);
    }
    const result = await studentService.validateStudent(prn);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
