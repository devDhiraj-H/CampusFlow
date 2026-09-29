import pool from "../db/pool.js";
import { startNotificationWorker, stopNotificationWorker } from "./notificationWorker.js";
import { processOutboxBatch } from "./outboxRelay.js";
import { getKafkaProducer, TOPIC_TICKETS } from "./kafkaClient.js";

async function runKafkaPipelineTest() {
  console.log("==================================================");
  console.log("   CampusFlow Kafka & Outbox Pipeline Test       ");
  console.log("==================================================\n");

  try {
    // 1. Ensure Kafka Producer connects
    console.log("👉 Step 1: Connecting Kafka Producer...");
    const producer = await getKafkaProducer();
    console.log("✅ Kafka Producer ready.\n");

    // 2. Start Kafka Consumer Worker
    console.log("👉 Step 2: Starting Notification Consumer Worker...");
    await startNotificationWorker("campusflow-test-consumer-group");
    console.log("✅ Kafka Consumer subscribed to topic:", TOPIC_TICKETS, "\n");

    // 3. Insert a fresh Outbox Event in PostgreSQL to test the Transactional Outbox
    console.log("👉 Step 3: Writing an atomic event to outbox_events table...");
    const testTicketId = "11111111-2222-3333-4444-555555555555";
    const insertQuery = `
      INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
      VALUES ('TICKET', $1, 'TICKET_CREATED', $2)
      RETURNING id, aggregate_id, event_type, processed
    `;
    const payload = JSON.stringify({
      ticket_id: testTicketId,
      title: "Library AC not cooling (Wing 3)",
      category: "MAINTENANCE",
      priority: "HIGH",
      department_routing: "IT_INFRASTRUCTURE",
      sla_deadline: new Date(Date.now() + 24 * 3600000).toISOString(),
      created_by: "2023CSE0101",
    });
    const insertRes = await pool.query(insertQuery, [testTicketId, payload]);
    const eventRow = insertRes.rows[0];
    console.log(`✅ Outbox row created in PostgreSQL: Event ID = ${eventRow.id}, processed = ${eventRow.processed}\n`);

    // 4. Trigger Outbox Relay to poll and publish to Kafka
    console.log("👉 Step 4: Executing Outbox Relay (PostgreSQL ➔ Kafka)...");
    const count = await processOutboxBatch();
    console.log(`✅ Outbox Relay successfully published ${count} event(s) to Kafka.\n`);

    // 5. Allow brief delay for consumer to process message
    console.log("👉 Step 5: Waiting 3 seconds for Kafka consumer to process message...");
    await new Promise((r) => setTimeout(r, 3000));

    // 6. Verify that processed is now TRUE in PostgreSQL
    console.log("\n👉 Step 6: Verifying database state...");
    const verifyRes = await pool.query(
      "SELECT id, aggregate_id, processed, processed_at FROM outbox_events WHERE id = $1",
      [eventRow.id]
    );
    const updatedRow = verifyRes.rows[0];
    console.log(`✅ Database Verification: processed = ${updatedRow.processed} (processed_at: ${updatedRow.processed_at})`);

    if (updatedRow.processed === true) {
      console.log("\n🎉 ALL KAFKA & TRANSACTIONAL OUTBOX TESTS PASSED SUCCESSFULLY!");
    } else {
      throw new Error("Outbox event status was not updated to processed=true!");
    }
  } catch (err: any) {
    console.error("❌ Kafka Pipeline Test Failed:", err);
    process.exit(1);
  } finally {
    await stopNotificationWorker();
    await pool.end();
    process.exit(0);
  }
}

runKafkaPipelineTest();
