import jwt, { SignOptions } from "jsonwebtoken";
import { JWTPayload } from "../types/auth.types.js";

export const JWT_SECRET =
  process.env.JWT_SECRET || process.env.jwt_key || "default_super_secret_key_campusflow";

export function generateToken(payload: JWTPayload, expiresIn: string | number = "24h"): string {
  const options: SignOptions = {
    expiresIn: expiresIn as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}
