"use strict";
// import { Request, Response, NextFunction } from "express";
// import jwt from "jsonwebtoken";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../prisma");
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    // Crash early at boot if secret is missing
    throw new Error("JWT_SECRET is not set in environment");
}
// Optional: let certain paths bypass auth
const PUBLIC_PATHS = new Set([
    "/api/health",
    // "/api/auth/login", "/api/auth/login/verify-otp" // keep public if needed
]);
const authenticate = async (req, res, next) => {
    try {
        if (PUBLIC_PATHS.has(req.path))
            return next();
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Authorization header missing or invalid." });
        }
        const token = authHeader.split(" ")[1];
        // 1) Verify JWT signature & parse claims
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // 2) Enforce presence of sessionId
        if (!decoded.sessionId) {
            return res.status(401).json({ message: "No active session." });
        }
        // 3) Check session exists and isn’t revoked
        const session = await prisma_1.prisma.session.findUnique({
            where: { id: decoded.sessionId },
            select: { id: true, revokedAt: true },
        });
        if (!session || session.revokedAt) {
            return res.status(401).json({ message: "Session expired or logged in on another device." });
        }
        // 4) Bump activity timestamp safely (explicit value)
        await prisma_1.prisma.session.update({
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
    }
    catch (err) {
        // Token errors (expired, malformed) or Prisma errors fall here
        console.error("Auth error:", err);
        return res.status(401).json({ message: "Invalid or expired token." });
    }
};
exports.authenticate = authenticate;
