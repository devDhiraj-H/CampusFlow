export type UserRole = "student" | "faculty" | "admin" | "staff";

export interface JWTPayload {
  auth_id: number;
  email: string;
  role: UserRole;
  prn?: string;
  name?: string;
}

export interface RegisterStudentDTO {
  prn: string;
  name: string;
  email: string;
  password: string;
  department: string;
  year: number;
  roll_no: string;
  hosteller: boolean;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface StudentProfile {
  prn: string;
  auth_id: number;
  name: string;
  email: string;
  department: string;
  year: number;
  roll_no: string;
  hosteller: boolean;
  created_at?: Date;
}

export interface AuthResponse {
  token: string;
  user: {
    auth_id: number;
    email: string;
    role: UserRole;
    name?: string;
    prn?: string;
  };
}
