import pool from "../db/pool.js";
import { getKafkaProducer, TOPIC_TICKETS } from "./kafkaClient.js";

let relayTimer: NodeJS.Timeout | null = null;
let isProcessing = false;

export async function processOutboxBatch(): Promise<number> {
  if (isProcessing) return 0;
  isProcessing = true;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch unprocessed outbox events with row-level locks
    const selectQuery = `
      SELECT id, aggregate_type, aggregate_id, event_type, payload, created_at
      FROM outbox_events
      WHERE processed = FALSE
      ORDER BY created_at ASC
      LIMIT 20
      FOR UPDATE SKIP LOCKED
    `;
    const res = await client.query(selectQuery);
    const events = res.rows;

    if (events.length === 0) {
      await client.query("COMMIT");
      return 0;
    }

    const producer = await getKafkaProducer();

    // Prepare Kafka message batch with aggregate key (guarantees partition ordering)
    const kafkaMessages = events.map((event) => {
      const payloadObj =
        typeof event.payload === "string"
          ? JSON.parse(event.payload)
          : event.payload;

      return {
        key: event.aggregate_id,
        value: JSON.stringify({
          event_id: event.id,
          aggregate_type: event.aggregate_type,
          aggregate_id: event.aggregate_id,
          event_type: event.event_type,
          payload: payloadObj,
          timestamp: event.created_at,
        }),
        headers: {
          eventType: event.event_type,
          aggregateType: event.aggregate_type,
          publishedAt: new Date().toISOString(),
        },
      };
    });

    // Stream batch to Kafka topic
    await producer.send({
      topic: TOPIC_TICKETS,
      messages: kafkaMessages,
    });

    // Mark events as processed in PostgreSQL
    const eventIds = events.map((e) => e.id);
    const updateQuery = `
      UPDATE outbox_events
      SET processed = TRUE, processed_at = CURRENT_TIMESTAMP
      WHERE id = ANY($1::uuid[])
    `;
    await client.query(updateQuery, [eventIds]);

    await client.query("COMMIT");
    console.log(`📤 [Outbox Relay] Streamed ${events.length} event(s) to Kafka topic '${TOPIC_TICKETS}'`);
    return events.length;
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("❌ [Outbox Relay Error]:", err.message);
    return 0;
  } finally {
    client.release();
    isProcessing = false;
  }
}

export function startOutboxRelay(intervalMs: number = 3000): void {
  if (relayTimer) return;
  console.log(`🚀 [Outbox Relay] Started polling outbox_events every ${intervalMs}ms`);

  // Run initial poll immediately
  processOutboxBatch().catch((err) =>
    console.error("[Outbox Relay Initial Error]:", err.message)
  );

  relayTimer = setInterval(() => {
    processOutboxBatch().catch((err) =>
      console.error("[Outbox Relay Interval Error]:", err.message)
    );
  }, intervalMs);
}

export function stopOutboxRelay(): void {
  if (relayTimer) {
    clearInterval(relayTimer);
    relayTimer = null;
    console.log("🛑 [Outbox Relay] Stopped polling");
  }
}
