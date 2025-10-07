"use strict";
// import { Request, Response } from "express";
// import bcrypt from "bcryptjs";
// import crypto from "crypto";
// import { PrismaClient, OtpPurpose, OtpChannel } from "@prisma/client";
// import { AuthRequest } from "../middlewares/middlewares"; // keep if correct
// import {
//   generateNumericOtp,
//   hashOtp,
//   addMinutes,
//   sendOtpEmail,
// } from "../lib/otpEmailHelpers";
// import { generateToken } from "../Utils/jwt"; // ✅ use the util; do NOT redeclare locally
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.changePassword = exports.updateUser = exports.verifyLoginOtp = exports.login = exports.deleteUser = exports.getUserById = exports.getAllUsers = exports.register = void 0;
exports.adminResetUserPassword = adminResetUserPassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const prisma_1 = require("../prisma");
const otpEmailHelpers_1 = require("../lib/otpEmailHelpers");
const jwt_1 = require("../Utils/jwt");
/* ===================== REGISTER ===================== */
const register = async (req, res) => {
    try {
        const { fullName, email, password, phoneNumber, role } = req.body;
        if (!fullName || !email || !password) {
            return res
                .status(400)
                .json({ message: "Full name, email, and password are required." });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: {
                fullName: fullName.trim(),
                email: String(email).toLowerCase(),
                password: hashedPassword,
                phoneNumber: (phoneNumber === null || phoneNumber === void 0 ? void 0 : phoneNumber.trim()) || null,
                role: role !== null && role !== void 0 ? role : client_1.Role.USER,
                mustChangePassword: true,
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                phoneNumber: true,
                role: true,
                mustChangePassword: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return res.status(201).json({
            message: "User created successfully. User must change password at first login.",
            user,
        });
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.code) === "P2002") {
            return res.status(409).json({
                message: "A user with this email or phone number already exists.",
            });
        }
        console.error("Register error:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};
exports.register = register;
/* ===================== LIST/GET/DELETE ===================== */
const getAllUsers = async (_req, res) => {
    try {
        const users = await prisma_1.prisma.user.findMany({
            where: { id: { not: 1 } },
            select: {
                id: true,
                fullName: true,
                email: true,
                phoneNumber: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: "desc" },
        });
        return res.json(users);
    }
    catch (error) {
        console.error("Get all users error:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};
exports.getAllUsers = getAllUsers;
const getUserById = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ message: "Invalid user ID." });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                fullName: true,
                email: true,
                phoneNumber: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user)
            return res.status(404).json({ message: "User not found." });
        return res.json(user);
    }
    catch (error) {
        console.error("Get user by ID error:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};
exports.getUserById = getUserById;
const deleteUser = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ message: "Invalid user ID." });
        }
        const exists = await prisma_1.prisma.user.findUnique({ where: { id } });
        if (!exists)
            return res.status(404).json({ message: "User not found." });
        await prisma_1.prisma.user.delete({ where: { id } });
        return res.json({ message: "User deleted successfully." });
    }
    catch (error) {
        console.error("Delete user error:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};
exports.deleteUser = deleteUser;
/* ===================== LOGIN (PASSWORD → SEND OTP) ===================== */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res
                .status(400)
                .json({ message: "Email and password are required." });
        }
        const normalizedEmail = email.trim().toLowerCase();
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: normalizedEmail },
        });
        if (!user) {
            return res
                .status(401)
                .json({ message: "Incorrect email or password." });
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res
                .status(401)
                .json({ message: "Incorrect email or password." });
        }
        // Remove any previous unexpired OTPs for LOGIN
        await prisma_1.prisma.oneTimePassword.deleteMany({
            where: {
                userId: user.id,
                purpose: client_1.OtpPurpose.LOGIN,
                consumedAt: null,
                expiresAt: { gt: new Date() },
            },
        });
        // Generate and persist OTP
        const otpCode = (0, otpEmailHelpers_1.generateNumericOtp)(6);
        const otpHash = await (0, otpEmailHelpers_1.hashOtp)(otpCode);
        const created = await prisma_1.prisma.oneTimePassword.create({
            data: {
                userId: user.id,
                purpose: client_1.OtpPurpose.LOGIN,
                channel: client_1.OtpChannel.EMAIL,
                destination: user.email,
                codeHash: otpHash,
                // UTC-safe expiry
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
                lastSentAt: new Date(),
            },
            select: { id: true, expiresAt: true },
        });
        await (0, otpEmailHelpers_1.sendOtpEmail)(user.email, otpCode);
        return res.status(200).json({
            message: "OTP sent to your email. Please verify to complete login.",
            email: user.email,
            otpId: created.id, // verify precisely
            expiresAt: created.expiresAt, // for UI countdown
            requirePasswordChange: user.mustChangePassword,
            ...(process.env.NODE_ENV !== "production" ? { devCode: otpCode } : {}),
        });
    }
    catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};
exports.login = login;
/* ===== VERIFY LOGIN OTP → REVOKE OLD SESSIONS → CREATE SESSION → ISSUE JWT ===== */
const verifyLoginOtp = async (req, res) => {
    var _a, _b, _c;
    try {
        const { otpId, code } = req.body;
        if (!otpId || !code) {
            return res.status(400).json({ message: "otpId and code are required." });
        }
        const otp = await prisma_1.prisma.oneTimePassword.findUnique({
            where: { id: Number(otpId) },
            include: { user: true },
        });
        if (!otp || !otp.user || otp.purpose !== client_1.OtpPurpose.LOGIN) {
            return res.status(400).json({ message: "Invalid OTP request." });
        }
        if (otp.consumedAt)
            return res.status(400).json({ message: "OTP already used." });
        if (otp.expiresAt <= new Date())
            return res.status(400).json({ message: "OTP expired." });
        const ok = await bcryptjs_1.default.compare(code, otp.codeHash);
        if (!ok) {
            await prisma_1.prisma.oneTimePassword.update({
                where: { id: otp.id },
                data: { attempts: { increment: 1 } },
            });
            return res.status(400).json({ message: "Incorrect OTP code." });
        }
        await prisma_1.prisma.oneTimePassword.update({
            where: { id: otp.id },
            data: { consumedAt: new Date() },
        });
        // SINGLE DEVICE: revoke active sessions then create a new one
        const deviceId = (req.header("x-device-id") || "") || ((_a = crypto_1.default.randomUUID) === null || _a === void 0 ? void 0 : _a.call(crypto_1.default)) || "unknown";
        const userAgent = req.header("user-agent") || "unknown";
        const ip = ((_c = (_b = req.headers["x-forwarded-for"]) === null || _b === void 0 ? void 0 : _b.split(",")[0]) === null || _c === void 0 ? void 0 : _c.trim()) ||
            req.socket.remoteAddress ||
            "";
        const session = await prisma_1.prisma.$transaction(async (tx) => {
            await tx.session.updateMany({
                where: { userId: otp.userId, revokedAt: null },
                data: { revokedAt: new Date() },
            });
            return tx.session.create({
                data: { userId: otp.userId, deviceId, userAgent, ip },
            });
        });
        const token = (0, jwt_1.generateToken)({
            id: otp.user.id,
            email: otp.user.email,
            role: otp.user.role,
            fullName: otp.user.fullName,
            sessionId: session.id, // REQUIRED
        });
        return res.status(200).json({
            message: "Login successful.",
            token,
            user: {
                id: otp.user.id,
                fullName: otp.user.fullName,
                email: otp.user.email,
                role: otp.user.role,
                mustChangePassword: otp.user.mustChangePassword,
            },
            session: {
                id: session.id,
                deviceId: session.deviceId,
                createdAt: session.createdAt,
            },
        });
    }
    catch (error) {
        console.error("Verify OTP error:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};
exports.verifyLoginOtp = verifyLoginOtp;
/* ===================== UPDATE (ADMIN ONLY) ===================== */
const updateUser = async (req, res) => {
    try {
        // @ts-ignore populate through authenticate middleware
        if (!req.user)
            return res.status(401).json({ message: "Unauthorized." });
        // @ts-ignore
        if (req.user.role !== "ADMIN") {
            return res.status(403).json({ message: "Only admins can update users." });
        }
        const id = Number(req.params.userId);
        if (Number.isNaN(id)) {
            return res.status(400).json({ message: "Invalid user ID." });
        }
        const { fullName, email, password, phoneNumber, role } = req.body;
        const data = {};
        if (fullName)
            data.fullName = fullName;
        if (email)
            data.email = email.toLowerCase();
        if (phoneNumber)
            data.phoneNumber = phoneNumber;
        if (role)
            data.role = role;
        if (password)
            data.password = await bcryptjs_1.default.hash(password, 10);
        const updated = await prisma_1.prisma.user.update({ where: { id }, data });
        return res.status(200).json({
            message: "User updated successfully.",
            user: {
                id: updated.id,
                fullName: updated.fullName,
                email: updated.email,
                phoneNumber: updated.phoneNumber,
                role: updated.role,
            },
        });
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.code) === "P2025") {
            return res.status(404).json({ message: "User not found." });
        }
        if ((error === null || error === void 0 ? void 0 : error.code) === "P2002") {
            return res.status(409).json({
                message: "A user with this email or phone number already exists.",
            });
        }
        console.error("Update user error:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};
exports.updateUser = updateUser;
/* ===================== CHANGE PASSWORD (SELF) ===================== */
const changePassword = async (req, res) => {
    try {
        // @ts-ignore
        if (!req.user)
            return res.status(401).json({ message: "Unauthorized." });
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res
                .status(400)
                .json({ message: "Old password and new password are required." });
        }
        // @ts-ignore
        const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user)
            return res.status(404).json({ message: "User not found." });
        const isOldValid = await bcryptjs_1.default.compare(oldPassword, user.password);
        if (!isOldValid) {
            return res.status(400).json({ message: "Old password is incorrect." });
        }
        const hashed = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { password: hashed, mustChangePassword: false },
        });
        // Revoke all active sessions after password change
        await prisma_1.prisma.session.updateMany({
            where: { userId: user.id, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        return res.json({
            message: "Password changed successfully. Please log in again with the new password.",
        });
    }
    catch (error) {
        console.error("Change password error:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};
exports.changePassword = changePassword;
/* ===================== ADMIN RESET PASSWORD (UTILITY) ===================== */
function generateRandomPassword(length = 10) {
    return crypto_1.default.randomBytes(length).toString("base64").slice(0, length);
}
async function adminResetUserPassword(userId) {
    const newPasswordPlain = generateRandomPassword(10);
    const hashedPassword = await bcryptjs_1.default.hash(newPasswordPlain, 10);
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: {
            password: hashedPassword,
            mustChangePassword: true,
            updatedAt: new Date(),
        },
    });
    await prisma_1.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
    });
    return newPasswordPlain;
}
/* ===================== LOGOUT (CURRENT SESSION) ===================== */
const logout = async (req, res) => {
    var _a;
    try {
        // @ts-ignore
        if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.sessionId)) {
            return res.status(400).json({ message: "No active session." });
        }
        await prisma_1.prisma.session.updateMany({
            // @ts-ignore
            where: { id: req.user.sessionId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        return res.status(200).json({ message: "Logged out." });
    }
    catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};
exports.logout = logout;
