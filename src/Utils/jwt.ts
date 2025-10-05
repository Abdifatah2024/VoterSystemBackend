import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

// 🔐 Define your secret key
const JWT_SECRET = process.env.JWT_SECRET || "your_fallback_secret";
const TOKEN_EXPIRY = "7d"; // 7 days, can adjust to your needs

// ✅ The shape of your token payload
export interface JwtPayload {
  id: number;
  email: string;
  role: string;
  fullName?: string;
}

/**
 * ✅ Generate a signed JWT token
 * @param user object containing id, email, role, etc.
 */
export function generateToken(user: JwtPayload): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
    algorithm: "HS256",
  });
}

/**
 * ✅ Verify and decode JWT token
 * @param token the JWT string from Authorization header
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (err) {
    console.error("JWT verification failed:", err);
    return null;
  }
}
