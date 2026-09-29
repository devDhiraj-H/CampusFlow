import { Request, Response, NextFunction } from "express";
import { UserRole } from "../types/auth.types.js";

export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required before role verification",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: "FORBIDDEN",
        message: `Access denied. Requires one of roles: ${allowedRoles.join(", ")}`,
      });
      return;
    }

    next();
  };
}
