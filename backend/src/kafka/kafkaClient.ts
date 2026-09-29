import { Kafka, Producer, Consumer, logLevel } from "kafkajs";

const brokers = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");

export const TOPIC_TICKETS = "campus.tickets";

export const kafka = new Kafka({
  clientId: "campusflow-engine",
  brokers,
  logLevel: logLevel.WARN,
  retry: {
    initialRetryTime: 300,
    retries: 8,
  },
});

let producerInstance: Producer | null = null;

export async function getKafkaProducer(): Promise<Producer> {
  if (!producerInstance) {
    producerInstance = kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });
    await producerInstance.connect();
    console.log("⚡ Kafka Producer connected successfully to", brokers.join(", "));
  }
  return producerInstance;
}

export function createKafkaConsumer(groupId: string = "campusflow-worker-group"): Consumer {
  return kafka.consumer({
    groupId,
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
  });
}
