"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendEmailOtp = exports.verifyEmailOtp = exports.requestEmailOtp = void 0;
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const prisma_1 = require("../prisma");
const otpEmailHelpers_1 = require("../lib/otpEmailHelpers");
const jwt_1 = require("../Utils/jwt");
/** Config */
const OTP_EXP_MIN = 5; // minutes
const MAX_RESENDS = 3; // per active OTP
const MAX_ATTEMPTS = 5; // per OTP
/** Helpers */
function normalizeEmail(email) {
    return (email !== null && email !== void 0 ? email : "").trim().toLowerCase();
}
function getDeviceMeta(req) {
    var _a, _b;
    const deviceId = (req.header("x-device-id") || "") || crypto_1.default.randomUUID();
    const userAgent = req.header("user-agent") || "unknown";
    const ip = ((_b = (_a = req.headers["x-forwarded-for"]) === null || _a === void 0 ? void 0 : _a.split(",")[0]) === null || _b === void 0 ? void 0 : _b.trim()) ||
        req.socket.remoteAddress ||
        "";
    return { deviceId, userAgent, ip };
}
/**
 * POST /api/otp/email/request
 * body: { email: string, purpose?: 'LOGIN' | 'PASSWORD_RESET' | 'MFA' }
 */
const requestEmailOtp = async (req, res) => {
    var _a, _b;
    try {
        const email = normalizeEmail((_a = req.body) === null || _a === void 0 ? void 0 : _a.email);
        const purposeKey = ((_b = req.body) === null || _b === void 0 ? void 0 : _b.purpose) || "LOGIN";
        if (!email)
            return res.status(400).json({ message: "Email is required." });
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user)
            return res.status(404).json({ message: "User not found." });
        // Keep only one active OTP per (user,purpose)
        await prisma_1.prisma.oneTimePassword.deleteMany({
            where: {
                userId: user.id,
                purpose: client_1.OtpPurpose[purposeKey],
                consumedAt: null,
                expiresAt: { gt: new Date() },
            },
        });
        const code = (0, otpEmailHelpers_1.generateNumericOtp)(6);
        const codeHash = await (0, otpEmailHelpers_1.hashOtp)(code);
        const created = await prisma_1.prisma.oneTimePassword.create({
            data: {
                userId: user.id,
                purpose: client_1.OtpPurpose[purposeKey],
                channel: client_1.OtpChannel.EMAIL,
                destination: email,
                codeHash,
                expiresAt: new Date(Date.now() + OTP_EXP_MIN * 60 * 1000),
                lastSentAt: new Date(),
            },
            select: { id: true, expiresAt: true },
        });
        await (0, otpEmailHelpers_1.sendOtpEmail)(email, code);
        return res.status(200).json({
            message: "OTP sent to email.",
            otp: { id: created.id, expiresAt: created.expiresAt },
            ...(process.env.NODE_ENV !== "production" ? { devCode: code } : {}),
        });
    }
    catch (err) {
        console.error("requestEmailOtp error:", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).json({ message: "Server error sending OTP." });
    }
};
exports.requestEmailOtp = requestEmailOtp;
/**
 * POST /api/otp/email/verify
 * body: { email: string, code: string, purpose?: 'LOGIN' | 'PASSWORD_RESET' | 'MFA', otpId?: number }
 *
 * ✅ Creates a Session, returns JWT with sessionId (required by your auth middleware)
 */
const verifyEmailOtp = async (req, res) => {
    var _a, _b, _c, _d;
    try {
        const email = normalizeEmail((_a = req.body) === null || _a === void 0 ? void 0 : _a.email);
        const code = String(((_b = req.body) === null || _b === void 0 ? void 0 : _b.code) || "");
        const otpId = ((_c = req.body) === null || _c === void 0 ? void 0 : _c.otpId) ? Number(req.body.otpId) : undefined;
        const purposeKey = ((_d = req.body) === null || _d === void 0 ? void 0 : _d.purpose) || "LOGIN";
        if (!email || !code) {
            return res.status(400).json({ message: "Email and code are required." });
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user)
            return res.status(404).json({ message: "User not found." });
        // Prefer exact OTP by id, otherwise latest active OTP for this user+purpose
        let otp = otpId
            ? await prisma_1.prisma.oneTimePassword.findUnique({ where: { id: otpId } })
            : null;
        if (!otp) {
            otp = await prisma_1.prisma.oneTimePassword.findFirst({
                where: {
                    userId: user.id,
                    purpose: client_1.OtpPurpose[purposeKey],
                    consumedAt: null,
                    expiresAt: { gt: new Date() },
                },
                orderBy: { createdAt: "desc" },
            });
        }
        if (!otp) {
            return res.status(400).json({ message: "No active OTP or it has expired." });
        }
        if (otp.userId !== user.id || otp.purpose !== client_1.OtpPurpose[purposeKey]) {
            return res.status(400).json({ message: "OTP does not match this request." });
        }
        if (otp.consumedAt)
            return res.status(400).json({ message: "OTP already used. Request a new one." });
        if (otp.expiresAt <= new Date())
            return res.status(400).json({ message: "OTP expired. Request a new one." });
        if (otp.attempts >= MAX_ATTEMPTS) {
            return res.status(429).json({ message: "Too many attempts. Request a new OTP." });
        }
        // Count attempt (rate-limit) before compare
        await prisma_1.prisma.oneTimePassword.update({
            where: { id: otp.id },
            data: { attempts: { increment: 1 } },
        });
        const ok = await (0, otpEmailHelpers_1.compareOtp)(code, otp.codeHash);
        if (!ok) {
            return res.status(401).json({ message: "Invalid code." });
        }
        // Mark consumed
        await prisma_1.prisma.oneTimePassword.update({
            where: { id: otp.id },
            data: { consumedAt: new Date() },
        });
        // SINGLE-DEVICE POLICY: revoke existing sessions, then create a new one
        const { deviceId, userAgent, ip } = getDeviceMeta(req);
        const session = await prisma_1.prisma.$transaction(async (tx) => {
            await tx.session.updateMany({
                where: { userId: user.id, revokedAt: null },
                data: { revokedAt: new Date() },
            });
            return tx.session.create({
                data: { userId: user.id, deviceId, userAgent, ip },
            });
        });
        // 🔑 JWT must include sessionId (your middleware enforces this)
        const token = (0, jwt_1.generateToken)({
            id: user.id,
            email: user.email,
            role: user.role,
            fullName: user.fullName,
            sessionId: session.id,
        });
        return res.status(200).json({
            message: "OTP verified. Login successful.",
            token, // standard key
            Access_token: token, // (kept for compatibility if your frontend expects this)
            requirePasswordChange: user.mustChangePassword,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
            },
            session: {
                id: session.id,
                deviceId: session.deviceId,
                createdAt: session.createdAt,
            },
        });
    }
    catch (err) {
        console.error("verifyEmailOtp error:", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).json({ message: "Server error verifying OTP." });
    }
};
exports.verifyEmailOtp = verifyEmailOtp;
/**
 * POST /api/otp/email/resend
 * body: { email: string, purpose?: 'LOGIN' | 'PASSWORD_RESET' | 'MFA' }
 */
const resendEmailOtp = async (req, res) => {
    var _a, _b;
    try {
        const email = normalizeEmail((_a = req.body) === null || _a === void 0 ? void 0 : _a.email);
        const purposeKey = ((_b = req.body) === null || _b === void 0 ? void 0 : _b.purpose) || "LOGIN";
        if (!email)
            return res.status(400).json({ message: "Email is required." });
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user)
            return res.status(404).json({ message: "User not found." });
        // Try to reuse the latest active OTP
        const existing = await prisma_1.prisma.oneTimePassword.findFirst({
            where: {
                userId: user.id,
                purpose: client_1.OtpPurpose[purposeKey],
                consumedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: "desc" },
        });
        if (existing) {
            if (existing.resendCount >= MAX_RESENDS) {
                return res
                    .status(429)
                    .json({ message: "Resend limit reached. Please request a new OTP later." });
            }
            const newCode = (0, otpEmailHelpers_1.generateNumericOtp)(6);
            const newHash = await (0, otpEmailHelpers_1.hashOtp)(newCode);
            const updated = await prisma_1.prisma.oneTimePassword.update({
                where: { id: existing.id },
                data: {
                    codeHash: newHash,
                    resendCount: { increment: 1 },
                    lastSentAt: new Date(),
                    expiresAt: new Date(Date.now() + OTP_EXP_MIN * 60 * 1000), // extend expiry
                },
                select: { id: true, resendCount: true, expiresAt: true },
            });
            await (0, otpEmailHelpers_1.sendOtpEmail)(email, newCode);
            return res.status(200).json({
                message: "OTP resent.",
                otp: { id: updated.id, expiresAt: updated.expiresAt, resendCount: updated.resendCount },
                ...(process.env.NODE_ENV !== "production" ? { devCode: newCode } : {}),
            });
        }
        // No active OTP → create a new one
        const code = (0, otpEmailHelpers_1.generateNumericOtp)(6);
        const codeHash = await (0, otpEmailHelpers_1.hashOtp)(code);
        const created = await prisma_1.prisma.oneTimePassword.create({
            data: {
                userId: user.id,
                purpose: client_1.OtpPurpose[purposeKey],
                channel: client_1.OtpChannel.EMAIL,
                destination: email,
                codeHash,
                expiresAt: new Date(Date.now() + OTP_EXP_MIN * 60 * 1000),
                lastSentAt: new Date(),
            },
            select: { id: true, expiresAt: true },
        });
        await (0, otpEmailHelpers_1.sendOtpEmail)(email, code);
        return res.status(200).json({
            message: "OTP sent.",
            otp: { id: created.id, expiresAt: created.expiresAt },
            ...(process.env.NODE_ENV !== "production" ? { devCode: code } : {}),
        });
    }
    catch (err) {
        console.error("resendEmailOtp error:", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).json({ message: "Server error resending OTP." });
    }
};
exports.resendEmailOtp = resendEmailOtp;
