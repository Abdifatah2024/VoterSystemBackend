"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // Load environment variables
// 🔐 Define your secret key
const JWT_SECRET = process.env.JWT_SECRET || "your_fallback_secret";
const TOKEN_EXPIRY = "7d"; // 7 days, can adjust to your needs
/**
 * ✅ Generate a signed JWT token
 * @param user object containing id, email, role, etc.
 */
function generateToken(user) {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
    };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        expiresIn: TOKEN_EXPIRY,
        algorithm: "HS256",
    });
}
/**
 * ✅ Verify and decode JWT token
 * @param token the JWT string from Authorization header
 */
function verifyToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch (err) {
        console.error("JWT verification failed:", err);
        return null;
    }
}
