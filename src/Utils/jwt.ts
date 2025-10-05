// import jwt from "jsonwebtoken";
// import dotenv from "dotenv";

// dotenv.config(); // Load environment variables

// // 🔐 Define your secret key
// const JWT_SECRET = process.env.JWT_SECRET || "your_fallback_secret";
// const TOKEN_EXPIRY = "7d"; // 7 days, can adjust to your needs

// // ✅ The shape of your token payload
// export interface JwtPayload {
//   id: number;
//   email: string;
//   role: string;
//   fullName?: string;
// }

// /**
//  * ✅ Generate a signed JWT token
//  * @param user object containing id, email, role, etc.
//  */
// export function generateToken(user: JwtPayload): string {
//   const payload = {
//     id: user.id,
//     email: user.email,
//     role: user.role,
//     fullName: user.fullName,
//   };

//   return jwt.sign(payload, JWT_SECRET, {
//     expiresIn: TOKEN_EXPIRY,
//     algorithm: "HS256",
//   });
// }

// /**
//  * ✅ Verify and decode JWT token
//  * @param token the JWT string from Authorization header
//  */
// export function verifyToken(token: string): JwtPayload | null {
//   try {
//     return jwt.verify(token, JWT_SECRET) as JwtPayload;
//   } catch (err) {
//     console.error("JWT verification failed:", err);
//     return null;
//   }
// }
// src/Utils/jwt.ts
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET: Secret = (process.env.JWT_SECRET || "your_fallback_secret");
// You can override via env: JWT_EXPIRES_IN=5h
const DEFAULT_EXPIRES_IN: SignOptions["expiresIn"] =
  (process.env.JWT_EXPIRES_IN as SignOptions["expiresIn"]) || "5h";

export interface JwtPayload {
  id: number;
  email: string;
  role: string;
  fullName?: string;
}

// include iat/exp on the decoded object
export type DecodedToken = JwtPayload & { iat: number; exp: number };

/**
 * Generate a signed JWT token (default 5h).
 * `expiresIn` accepts values like "30m", "5h", "7d" or a number (seconds).
 */
export function generateToken(
  user: JwtPayload,
  expiresIn?: SignOptions["expiresIn"]
): string {
  const payload: JwtPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
  };

  const opts: SignOptions = {
    algorithm: "HS256",
    expiresIn: expiresIn ?? DEFAULT_EXPIRES_IN,
  };

  return jwt.sign(payload, JWT_SECRET, opts);
}

/** Verify and decode a JWT token. Returns null if invalid/expired. */
export function verifyToken(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, JWT_SECRET) as DecodedToken;
  } catch (err) {
    console.error("JWT verification failed:", err);
    return null;
  }
}
