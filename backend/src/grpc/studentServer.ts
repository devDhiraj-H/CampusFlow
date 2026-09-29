import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import * as studentService from "../services/studentService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve proto file path whether running from src/ (development) or dist/ (production)
function getProtoPath(): string {
  const candidate1 = path.join(__dirname, "../proto/student.proto");
  const candidate2 = path.join(__dirname, "../../src/proto/student.proto");
  const candidate3 = path.join(process.cwd(), "src/proto/student.proto");

  if (fs.existsSync(candidate1)) return candidate1;
  if (fs.existsSync(candidate2)) return candidate2;
  if (fs.existsSync(candidate3)) return candidate3;

  throw new Error("student.proto file could not be located");
}

const PROTO_PATH = getProtoPath();

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const studentProto = protoDescriptor.campusflow.student;

export class StudentGrpcServer {
  private server: grpc.Server;
  private port: number;

  constructor(port: number = 50051) {
    this.port = port;
    this.server = new grpc.Server();
    this.registerServices();
  }

  private registerServices(): void {
    this.server.addService(studentProto.StudentRpcService.service, {
      GetStudentProfile: async (
        call: grpc.ServerUnaryCall<any, any>,
        callback: grpc.sendUnaryData<any>
      ) => {
        try {
          const { prn } = call.request;
          const student = await studentService.getStudentByPrn(prn);
          callback(null, {
            found: true,
            prn: student.prn,
            name: student.name,
            email: student.email,
            department: student.department,
            year: student.year,
            roll_no: student.roll_no,
            hosteller: student.hosteller,
            error_message: "",
          });
        } catch (err: any) {
          callback(null, {
            found: false,
            error_message: err.message || "Student profile not found",
          });
        }
      },

      ValidateEligibility: async (
        call: grpc.ServerUnaryCall<any, any>,
        callback: grpc.sendUnaryData<any>
      ) => {
        try {
          const { prn, category } = call.request;
          const student = await studentService.getStudentByPrn(prn);

          if (!student) {
            return callback(null, {
              is_eligible: false,
              reason: `Student with PRN '${prn}' is not registered in the system`,
              department: "",
              is_hosteller: false,
              student_name: "",
            });
          }

          if (category === "HOSTEL" && !student.hosteller) {
            return callback(null, {
              is_eligible: false,
              reason: "Access Denied: Only registered hostel residents can raise hostel maintenance requests.",
              department: student.department,
              is_hosteller: false,
              student_name: student.name,
            });
          }

          callback(null, {
            is_eligible: true,
            reason: "Eligibility verified via gRPC",
            department: student.department,
            is_hosteller: student.hosteller,
            student_name: student.name,
          });
        } catch (err: any) {
          callback(null, {
            is_eligible: false,
            reason: err.message || "Student validation error",
            department: "",
            is_hosteller: false,
            student_name: "",
          });
        }
      },
    });
  }

  public start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server.bindAsync(
        `0.0.0.0:${this.port}`,
        grpc.ServerCredentials.createInsecure(),
        (err, boundPort) => {
          if (err) {
            return reject(err);
          }
          console.log(`📡 gRPC StudentRpcService listening on port ${boundPort}`);
          resolve(boundPort);
        }
      );
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.tryShutdown(() => {
        console.log("gRPC Server shut down successfully");
        resolve();
      });
    });
  }
}

let serverInstance: StudentGrpcServer | null = null;

export function getOrCreateGrpcServer(port: number = 50051): StudentGrpcServer {
  if (!serverInstance) {
    serverInstance = new StudentGrpcServer(port);
  }
  return serverInstance;
}
