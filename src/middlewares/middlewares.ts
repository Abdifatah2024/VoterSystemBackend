// import { Request, Response, NextFunction } from "express";
// import jwt from "jsonwebtoken";

// // Define what your token payload looks like
// interface JwtPayload {
//   userId: number;
//   role: string;
//   iat: number;
//   exp: number;
// }

// // Extend Request to include `user`
// export interface AuthRequest extends Request {
//   user?: {
//     id: number;
//     role: string;
//   };
// }

// export const authenticate = (
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     return res
//       .status(401)
//       .json({ message: "Authorization header missing or invalid." });
//   }

//   const token = authHeader.split(" ")[1];

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

//     req.user = {
//       id: decoded.userId,
//       role: decoded.role,
//     };

//     next();
//   } catch (err) {
//     return res.status(401).json({ message: "Invalid or expired token." });
//   }
// };
// src/middlewares/authenticate.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // Crash early at boot if secret is missing
  throw new Error("JWT_SECRET is not set in environment");
}

interface JwtPayload {
  id: number;           // matches generateToken payload
  role: string;
  sessionId?: string;   // required for single-device auth
  iat: number;
  exp: number;
}

export interface AuthUser {
  id: number;
  role: string;
  sessionId?: string;
}
export interface AuthRequest extends Request {
  user?: AuthUser;
}

// Optional: let certain paths bypass auth
const PUBLIC_PATHS = new Set<string>([
  "/api/health",
  // "/api/auth/login", "/api/auth/login/verify-otp" // keep public if needed
]);

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (PUBLIC_PATHS.has(req.path)) return next();

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization header missing or invalid." });
    }

    const token = authHeader.split(" ")[1];

    // 1) Verify JWT signature & parse claims
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // 2) Enforce presence of sessionId
    if (!decoded.sessionId) {
      return res.status(401).json({ message: "No active session." });
    }

    // 3) Check session exists and isn’t revoked
    const session = await prisma.session.findUnique({
      where: { id: decoded.sessionId },
      select: { id: true, revokedAt: true },
    });

    if (!session || session.revokedAt) {
      return res.status(401).json({ message: "Session expired or logged in on another device." });
    }

    // 4) Bump activity timestamp safely (explicit value)
    await prisma.session.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    });

    // 5) Attach user to request
    req.user = {
      id: decoded.id,
      role: decoded.role,
      sessionId: decoded.sessionId,
    };

    return next();
  } catch (err) {
    // Token errors (expired, malformed) or Prisma errors fall here
    console.error("Auth error:", err);
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};
