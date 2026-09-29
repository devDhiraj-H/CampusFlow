import { createKafkaConsumer, TOPIC_TICKETS } from "./kafkaClient.js";
import { Consumer } from "kafkajs";

let consumerInstance: Consumer | null = null;
const processedEventsLog: Array<{
  timestamp: string;
  eventType: string;
  details: string;
}> = [];

export async function startNotificationWorker(
  groupId: string = "campusflow-notifications-worker"
): Promise<Consumer> {
  if (consumerInstance) return consumerInstance;

  consumerInstance = createKafkaConsumer(groupId);
  await consumerInstance.connect();
  console.log(`🎧 [Kafka Worker] Connected to cluster with group '${groupId}'`);

  await consumerInstance.subscribe({
    topic: TOPIC_TICKETS,
    fromBeginning: false,
  });

  await consumerInstance.run({
    eachMessage: async ({ topic, partition, message }) => {
      const rawValue = message.value?.toString();
      if (!rawValue) return;

      try {
        const event = JSON.parse(rawValue);
        const { event_type, payload } = event;

        let logDetail = "";

        switch (event_type) {
          case "TICKET_CREATED":
            logDetail = `Ticket '${payload.title}' created by ${payload.created_by}. Routed to ${payload.department_routing}. SLA: ${payload.sla_deadline}`;
            console.log("\n=======================================================");
            console.log(`📧 [NOTIFICATION] New Ticket Created: "${payload.title}"`);
            console.log(`   ➔ Recipient 1: Student (${payload.created_by})`);
            console.log(`   ➔ Recipient 2: Department Desk (${payload.department_routing})`);
            console.log(`   ➔ Priority: ${payload.priority} | SLA Deadline: ${payload.sla_deadline}`);
            console.log("=======================================================\n");
            break;

          case "TICKET_ASSIGNED":
            logDetail = `Ticket '${payload.ticket_id}' assigned to ${payload.assigned_to}`;
            console.log("\n=======================================================");
            console.log(`🔔 [STAFF DISPATCH] Technician Assigned: ${payload.assigned_to}`);
            console.log(`   ➔ Ticket ID: ${payload.ticket_id}`);
            console.log(`   ➔ Assigned By: ${payload.assigned_by}`);
            console.log("=======================================================\n");
            break;

          case "TICKET_RESOLVED":
            logDetail = `Ticket '${payload.ticket_id}' RESOLVED. Resolution notice sent.`;
            console.log("\n=======================================================");
            console.log(`🎉 [RESOLUTION CONFIRMATION] Ticket Marked RESOLVED`);
            console.log(`   ➔ Ticket ID: ${payload.ticket_id}`);
            console.log(`   ➔ Resolved By: ${payload.actor}`);
            console.log(`   ➔ Remarks: "${payload.notes || 'No remarks'}"`);
            console.log("=======================================================\n");
            break;

          case "TICKET_COMMENT_ADDED":
            logDetail = `Comment added on ticket '${payload.ticket_id}' by ${payload.author}`;
            console.log("\n=======================================================");
            console.log(`💬 [THREAD UPDATE] New comment on ticket '${payload.ticket_id}'`);
            console.log(`   ➔ Author: ${payload.author} (${payload.role})`);
            console.log("=======================================================\n");
            break;

          case "STUDENT_REGISTERED":
            logDetail = `Welcome email sent to ${payload.email} (PRN: ${payload.prn})`;
            console.log("\n=======================================================");
            console.log(`🎓 [STUDENT ONBOARDING] Welcome email dispatched`);
            console.log(`   ➔ Student: ${payload.name} (${payload.prn})`);
            console.log(`   ➔ Department: ${payload.department}`);
            console.log(`   ➔ Email: ${payload.email}`);
            console.log("=======================================================\n");
            break;

          default:
            logDetail = `Processed event: ${event_type}`;
            console.log(`ℹ️ [Kafka Worker] Consumed unhandled event type: ${event_type}`);
        }

        processedEventsLog.push({
          timestamp: new Date().toISOString(),
          eventType: event_type,
          details: logDetail,
        });

        // Keep in-memory audit log bounded to 100 recent entries
        if (processedEventsLog.length > 100) {
          processedEventsLog.shift();
        }
      } catch (err: any) {
        console.error("❌ [Kafka Worker Message Error]:", err.message);
      }
    },
  });

  console.log(`✅ [Kafka Worker] Listening for events on topic '${TOPIC_TICKETS}'`);
  return consumerInstance;
}

export function getProcessedEventsLog() {
  return processedEventsLog;
}

export async function stopNotificationWorker(): Promise<void> {
  if (consumerInstance) {
    await consumerInstance.disconnect();
    consumerInstance = null;
    console.log("🛑 [Kafka Worker] Disconnected from Kafka");
  }
}
