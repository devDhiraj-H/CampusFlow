import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import pool from "./db/pool.js";
import authRouter from "./routes/authRoutes.js";
import studentRouter from "./routes/studentRoutes.js";
import ticketRouter from "./routes/ticketRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { getOrCreateGrpcServer } from "./grpc/studentServer.js";
import { startOutboxRelay, stopOutboxRelay } from "./kafka/outboxRelay.js";
import { startNotificationWorker, stopNotificationWorker } from "./kafka/notificationWorker.js";
import { createAndMountApolloServer } from "./graphql/apolloServer.js";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const GRPC_PORT = process.env.GRPC_PORT ? parseInt(process.env.GRPC_PORT, 10) : 50051;

// Core Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());

// Request logger for development
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint (critical for Docker / Kubernetes probes)
app.get("/health", async (_req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({
      status: "healthy",
      service: "campusflow-core",
      timestamp: new Date().toISOString(),
      database: "connected",
      grpc: `listening_on_${GRPC_PORT}`,
      kafka: "streaming_enabled",
      graphql: "enabled_on_/graphql",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database unreachable";
    res.status(503).json({
      status: "degraded",
      service: "campusflow-core",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      details: message,
    });
  }
});

// Root API welcome
app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "CampusFlow API, RPC, GraphQL & Event Engine",
    version: "1.0.0",
    description: "Campus Operations, GraphQL Gateway, gRPC Microservice, Apache Kafka & Outbox Pipeline",
    endpoints: {
      health: "/health",
      graphql: "/graphql",
      auth: "/api/auth",
      students: "/api/students",
      tickets: "/api/tickets",
      grpc: `0.0.0.0:${GRPC_PORT}`,
      kafka_topic: "campus.tickets",
    },
  });
});

// Mount REST Routes
app.use("/api/auth", authRouter);
app.use("/api/students", studentRouter);
app.use("/api/tickets", ticketRouter);

// Mount GraphQL API Gateway (Apollo Server)
const apolloServer = await createAndMountApolloServer(app);
console.log(`🧭 GraphQL Gateway available at http://localhost:${PORT}/graphql`);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global Error Handler
app.use(errorHandler);

// 1. Start HTTP Server
const server = app.listen(PORT, () => {
  console.log(`🚀 CampusFlow HTTP & GraphQL API running on port ${PORT}`);
  console.log(`👉 Health check: http://localhost:${PORT}/health`);
  console.log(`👉 GraphQL Playground: http://localhost:${PORT}/graphql`);
});

// 2. Start gRPC RPC Server
const grpcServer = getOrCreateGrpcServer(GRPC_PORT);
grpcServer.start().catch((err) => {
  console.error("Failed to start gRPC server:", err);
});

// 3. Start Apache Kafka Outbox Relay and Notification Worker
startOutboxRelay(3000);
startNotificationWorker().catch((err) => {
  console.warn("Kafka notification worker initialization deferred/warning:", err.message);
});

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  console.log(`\n[${signal}] Received. Shutting down gracefully...`);
  server.close(async () => {
    console.log("HTTP server closed.");
    try {
      await apolloServer.stop();
      stopOutboxRelay();
      await stopNotificationWorker();
      await grpcServer.stop();
      await pool.end();
      console.log("All connections (Postgres, Kafka, gRPC, Apollo) closed cleanly.");
    } catch (err) {
      console.error("Error during graceful shutdown:", err);
    }
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
