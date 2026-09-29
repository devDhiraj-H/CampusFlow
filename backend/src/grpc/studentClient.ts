import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export interface GrpcStudentProfileResponse {
  found: boolean;
  prn?: string;
  name?: string;
  email?: string;
  department?: string;
  year?: number;
  roll_no?: string;
  hosteller?: boolean;
  error_message?: string;
}

export interface GrpcEligibilityResponse {
  is_eligible: boolean;
  reason: string;
  department?: string;
  is_hosteller?: boolean;
  student_name?: string;
}

export class StudentGrpcClient {
  private client: any;

  constructor(targetUrl?: string) {
    const target = targetUrl || process.env.GRPC_STUDENT_HOST || "localhost:50051";
    this.client = new studentProto.StudentRpcService(
      target,
      grpc.credentials.createInsecure()
    );
  }

  public getProfile(prn: string): Promise<GrpcStudentProfileResponse> {
    return new Promise((resolve, reject) => {
      this.client.GetStudentProfile({ prn }, (err: any, response: GrpcStudentProfileResponse) => {
        if (err) return reject(err);
        resolve(response);
      });
    });
  }

  public validateEligibility(
    prn: string,
    category: string
  ): Promise<GrpcEligibilityResponse> {
    return new Promise((resolve, reject) => {
      this.client.ValidateEligibility(
        { prn, category },
        (err: any, response: GrpcEligibilityResponse) => {
          if (err) return reject(err);
          resolve(response);
        }
      );
    });
  }

  public close(): void {
    grpc.closeClient(this.client);
  }
}

let clientInstance: StudentGrpcClient | null = null;

export function getStudentGrpcClient(): StudentGrpcClient {
  if (!clientInstance) {
    clientInstance = new StudentGrpcClient();
  }
  return clientInstance;
}
