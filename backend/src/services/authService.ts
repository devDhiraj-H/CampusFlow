import pool from "../db/pool.js";
import { generateHashPassword, checkPassword } from "../utils/password.js";
import { generateToken } from "../utils/jwt.js";
import {
  RegisterStudentDTO,
  LoginDTO,
  AuthResponse,
  JWTPayload,
  StudentProfile,
} from "../types/auth.types.js";
import { AppError } from "../middleware/errorHandler.js";

export async function registerStudent(
  data: RegisterStudentDTO
): Promise<{ auth_id: number; prn: string; name: string; email: string }> {
  const { prn, name, email, password, department, year, roll_no, hosteller } =
    data;

  if (!prn || !email || !password || !name) {
    throw new AppError("PRN, name, email, and password are required", 400);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Check if user already exists
    const existing = await client.query(
      "SELECT id FROM auth_account WHERE email = $1",
      [email]
    );
    if (existing.rows.length > 0) {
      throw new AppError("Email is already registered", 409);
    }

    // 2. Hash password and insert auth_account
    const hashPassword = await generateHashPassword(password);
    const authText =
      "INSERT INTO auth_account (email, password_hash, role) VALUES ($1, $2, 'student') RETURNING id";
    const authRes = await client.query(authText, [email, hashPassword]);
    const auth_id = authRes.rows[0].id;

    // 3. Insert student profile
    const studentText = `
      INSERT INTO students (prn, auth_id, name, department, year, roll_no, hosteller)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    await client.query(studentText, [
      prn,
      auth_id,
      name,
      department,
      year,
      roll_no,
      Boolean(hosteller),
    ]);

    // 4. Outbox event for student registration
    const outboxText = `
      INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
      VALUES ('STUDENT', $1, 'STUDENT_REGISTERED', $2)
    `;
    const outboxPayload = JSON.stringify({
      auth_id,
      prn,
      name,
      email,
      department,
      registered_at: new Date().toISOString(),
    });
    await client.query(outboxText, [prn, outboxPayload]);

    await client.query("COMMIT");
    return { auth_id, prn, name, email };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function loginStudent(credentials: LoginDTO): Promise<AuthResponse> {
  const { email, password } = credentials;

  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const result = await pool.query(
    `SELECT a.id, a.email, a.password_hash, a.role, s.prn, s.name
     FROM auth_account a
     LEFT JOIN students s ON s.auth_id = a.id
     WHERE a.email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    throw new AppError("Invalid email or password", 401);
  }

  const userRecord = result.rows[0];
  const isMatch = await checkPassword(password, userRecord.password_hash);
  if (!isMatch) {
    throw new AppError("Invalid email or password", 401);
  }

  const payload: JWTPayload = {
    auth_id: userRecord.id,
    email: userRecord.email,
    role: userRecord.role,
    prn: userRecord.prn || undefined,
    name: userRecord.name || undefined,
  };

  const token = generateToken(payload);

  return {
    token,
    user: {
      auth_id: userRecord.id,
      email: userRecord.email,
      role: userRecord.role,
      name: userRecord.name,
      prn: userRecord.prn,
    },
  };
}

export async function getStudentProfileByAuthId(
  authId: number
): Promise<StudentProfile | null> {
  const query = `
    SELECT s.prn, s.auth_id, s.name, a.email, s.department, s.year, s.roll_no, s.hosteller, s.created_at
    FROM students s
    JOIN auth_account a ON a.id = s.auth_id
    WHERE s.auth_id = $1
  `;
  const result = await pool.query(query, [authId]);
  return result.rows[0] || null;
}
