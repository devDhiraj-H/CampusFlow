import pool from "./pool.js";
import { generateHashPassword } from "../utils/password.js";

export async function seedDemoData() {
  const client = await pool.connect();
  try {
    console.log("🌱 Seeding Demo Accounts and Operations Data...");
    await client.query("BEGIN");

    const defaultPasswordHash = await generateHashPassword("Password123!");

    // 1. Hosteller Student: Aarav Sharma
    await client.query(`
      INSERT INTO auth_account (email, password_hash, role)
      VALUES ('aarav@college.edu', $1, 'student')
      ON CONFLICT (email) DO NOTHING
    `, [defaultPasswordHash]);

    const aaravAuth = await client.query("SELECT id FROM auth_account WHERE email = 'aarav@college.edu'");
    if (aaravAuth.rows.length > 0) {
      await client.query(`
        INSERT INTO students (prn, auth_id, name, department, year, roll_no, hosteller)
        VALUES ('2023CSE0101', $1, 'Aarav Sharma', 'COMPUTER_SCIENCE', 3, 'CS-101', TRUE)
        ON CONFLICT (prn) DO UPDATE SET hosteller = TRUE, department = 'COMPUTER_SCIENCE'
      `, [aaravAuth.rows[0].id]);
    }

    // 2. Day Scholar Student: Ananya Verma (Non-hosteller to test gRPC rejection)
    await client.query(`
      INSERT INTO auth_account (email, password_hash, role)
      VALUES ('ananya@college.edu', $1, 'student')
      ON CONFLICT (email) DO NOTHING
    `, [defaultPasswordHash]);

    const ananyaAuth = await client.query("SELECT id FROM auth_account WHERE email = 'ananya@college.edu'");
    if (ananyaAuth.rows.length > 0) {
      await client.query(`
        INSERT INTO students (prn, auth_id, name, department, year, roll_no, hosteller)
        VALUES ('2023ECE0205', $1, 'Ananya Verma', 'ELECTRONICS', 2, 'EC-205', FALSE)
        ON CONFLICT (prn) DO UPDATE SET hosteller = FALSE, department = 'ELECTRONICS'
      `, [ananyaAuth.rows[0].id]);
    }

    // 3. Staff Member: Warden Rajesh Kumar
    await client.query(`
      INSERT INTO auth_account (email, password_hash, role)
      VALUES ('warden@campusflow.edu', $1, 'staff')
      ON CONFLICT (email) DO UPDATE SET role = 'staff'
    `, [defaultPasswordHash]);

    // 4. Administrator: Chief Admin Desk
    await client.query(`
      INSERT INTO auth_account (email, password_hash, role)
      VALUES ('admin@campusflow.edu', $1, 'admin')
      ON CONFLICT (email) DO UPDATE SET role = 'admin'
    `, [defaultPasswordHash]);

    // 5. Check if sample tickets exist; if total < 3, insert realistic tickets
    const ticketCountRes = await client.query("SELECT COUNT(*) FROM tickets");
    const count = parseInt(ticketCountRes.rows[0].count, 10);

    if (count < 3) {
      // Sample 1: Academic ticket
      const academicRes = await client.query(`
        INSERT INTO tickets (
          title, description, category, priority, status,
          department_routing, sla_deadline, is_sla_breached,
          created_by, assigned_to
        )
        VALUES (
          'MATLAB License Expiry in Lab 4',
          'Workstations 12 to 20 in VLSI Design Lab show expired tool license key for DSP coursework.',
          'ACADEMIC', 'HIGH', 'IN_PROGRESS',
          'ACADEMIC_OFFICE', CURRENT_TIMESTAMP + INTERVAL '18 hours', FALSE,
          '2023CSE0101', 'Prof. Kulkarni'
        )
        RETURNING id
      `);
      const t1 = academicRes.rows[0].id;
      await client.query(`
        INSERT INTO ticket_activities (ticket_id, actor, action, from_status, to_status, notes)
        VALUES ($1, '2023CSE0101', 'CREATED', NULL, 'OPEN', 'Raised by student Aarav Sharma'),
               ($1, 'Prof. Kulkarni', 'STATUS_CHANGED', 'OPEN', 'IN_PROGRESS', 'Department coordinator assigned to IT vendor')
      `, [t1]);
      await client.query(`
        INSERT INTO ticket_comments (ticket_id, author_id, author_role, author_name, comment)
        VALUES ($1, 'Prof. Kulkarni', 'faculty', 'Prof. Kulkarni', 'MathWorks regional license server renewal is underway, ETA 4 PM.')
      `, [t1]);

      // Sample 2: Maintenance ticket (breached SLA sample)
      const maintRes = await client.query(`
        INSERT INTO tickets (
          title, description, category, priority, status,
          department_routing, sla_deadline, is_sla_breached,
          created_by
        )
        VALUES (
          'Water Cooler Leakage in Academic Block 2',
          'Heavy water leakage from first-floor drinking water station near Seminar Hall.',
          'MAINTENANCE', 'MEDIUM', 'OPEN',
          'IT_INFRASTRUCTURE', CURRENT_TIMESTAMP - INTERVAL '6 hours', TRUE,
          '2023ECE0205'
        )
        RETURNING id
      `);
      const t2 = maintRes.rows[0].id;
      await client.query(`
        INSERT INTO ticket_activities (ticket_id, actor, action, from_status, to_status, notes)
        VALUES ($1, '2023ECE0205', 'CREATED', NULL, 'OPEN', 'Raised by student Ananya Verma'),
               ($1, 'SYSTEM_SLA_ENGINE', 'BREACH_DETECTED', 'OPEN', 'OPEN', 'SLA deadline exceeded. Escalated to Facilities Desk.')
      `, [t2]);
    }

    await client.query("COMMIT");
    console.log("✔ Seed data initialized successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed:", err);
  } finally {
    client.release();
  }
}

// Run directly if called as a standalone script
if (process.argv[1]?.endsWith("seedDemoData.ts") || process.argv[1]?.endsWith("seedDemoData.js")) {
  seedDemoData().then(() => pool.end());
}
