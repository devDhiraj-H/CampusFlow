import pool from "../db/pool.js";
import { StudentProfile } from "../types/auth.types.js";
import { AppError } from "../middleware/errorHandler.js";

export async function getStudentByPrn(prn: string): Promise<StudentProfile> {
  const query = `
    SELECT s.prn, s.auth_id, s.name, a.email, s.department, s.year, s.roll_no, s.hosteller, s.created_at
    FROM students s
    JOIN auth_account a ON a.id = s.auth_id
    WHERE s.prn = $1
  `;
  const res = await pool.query(query, [prn]);
  if (res.rows.length === 0) {
    throw new AppError(`Student with PRN '${prn}' not found`, 404);
  }
  return res.rows[0];
}

export async function validateStudent(prn: string): Promise<{
  valid: boolean;
  student?: StudentProfile;
}> {
  try {
    const student = await getStudentByPrn(prn);
    return { valid: true, student };
  } catch {
    return { valid: false };
  }
}

export async function listStudents(department?: string): Promise<StudentProfile[]> {
  let query = `
    SELECT s.prn, s.auth_id, s.name, a.email, s.department, s.year, s.roll_no, s.hosteller, s.created_at
    FROM students s
    JOIN auth_account a ON a.id = s.auth_id
  `;
  const values: unknown[] = [];

  if (department) {
    query += " WHERE s.department = $1";
    values.push(department);
  }
  query += " ORDER BY s.prn ASC";

  const res = await pool.query(query, values);
  return res.rows;
}
