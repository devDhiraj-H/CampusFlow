import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Access token is required in Authorization header",
    });
    return;
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Token verification failed";
    res.status(403).json({
      error: "FORBIDDEN",
      message: "Invalid or expired token",
      details: errorMessage,
    });
  }
}
