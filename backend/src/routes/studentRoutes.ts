import { Router } from "express";
import {
  getStudentByPrn,
  listStudents,
  validateStudent,
} from "../controllers/studentController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", authenticateToken, listStudents);
router.get("/:prn", authenticateToken, getStudentByPrn);
router.get("/:prn/validate", validateStudent);

export default router;
