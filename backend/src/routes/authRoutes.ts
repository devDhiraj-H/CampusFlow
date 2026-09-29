import { Router } from "express";
import {
  registerStudent,
  loginStudent,
  getStudentDashboard,
  getProfile,
} from "../controllers/authController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = Router();

// Public routes
router.post("/student/register", registerStudent);
router.post("/student/login", loginStudent);

// Protected routes
router.get("/student/dashboard", authenticateToken, getStudentDashboard);
router.get("/student/profile", authenticateToken, getProfile);

export default router;
