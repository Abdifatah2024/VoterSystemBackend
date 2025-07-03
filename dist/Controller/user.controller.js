"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.updateUser = exports.login = exports.generateToken = exports.deleteUser = exports.getUserById = exports.getAllUsers = exports.register = void 0;
exports.adminResetUserPassword = adminResetUserPassword;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma = new client_1.PrismaClient();
const crypto_1 = __importDefault(require("crypto"));
const register = async (req, res) => {
    try {
        const { fullName, email, password, phoneNumber, role } = req.body;
        if (!fullName || !email || !password) {
            return res
                .status(400)
                .json({ message: "Full name, email, and password are required." });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                fullName,
                email: email.toLowerCase(),
                password: hashedPassword,
                phoneNumber,
                role: role !== null && role !== void 0 ? role : "USER",
                mustChangePassword: true, // ✅ Require password change on first login
            },
        });
        res.status(201).json({
            message: "User created successfully. User must change password at first login.",
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
                mustChangePassword: user.mustChangePassword,
            },
        });
    }
    catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({
                message: "A user with this email or phone number already exists.",
            });
        }
        console.error(error);
        res.status(500).json({ message: "Internal server error." });
    }
};
exports.register = register;
const getAllUsers = async (_req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                email: {
                    not: "abdi12546@gmail.com",
                },
            },
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
        const user = await prisma.user.findUnique({
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
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
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
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        await prisma.user.delete({ where: { id } });
        return res.json({ message: "User deleted successfully." });
    }
    catch (error) {
        console.error("Delete user error:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};
exports.deleteUser = deleteUser;
const generateToken = (user) => {
    return jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "30d" });
};
exports.generateToken = generateToken;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res
                .status(400)
                .json({ message: "Email and password are required." });
        }
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (!user) {
            return res.status(401).json({ message: "Incorrect email or password." });
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Incorrect email or password." });
        }
        // ✅ Always generate the token
        const token = (0, exports.generateToken)(user);
        // ✅ Always return the token, even if must change password
        return res.status(200).json({
            message: user.mustChangePassword
                ? "Password change required before logging in."
                : "Login successful.",
            requirePasswordChange: user.mustChangePassword,
            Access_token: token, // <-- THIS IS WHAT YOU ARE MISSING
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};
exports.login = login;
const updateUser = async (req, res) => {
    try {
        // Make sure the user is authenticated
        //@ts-ignore
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized." });
        }
        // Check if the user has ADMIN role
        //@ts-ignore
        if (req.user.role !== "ADMIN") {
            return res.status(403).json({ message: "Only admins can update users." });
        }
        const { userId } = req.params;
        const { fullName, email, password, phoneNumber, role } = req.body;
        if (!userId) {
            return res.status(400).json({ message: "User ID is required." });
        }
        // Prepare update data
        const updateData = {};
        if (fullName)
            updateData.fullName = fullName;
        if (email)
            updateData.email = email.toLowerCase();
        if (phoneNumber)
            updateData.phoneNumber = phoneNumber;
        if (role)
            updateData.role = role;
        if (password) {
            updateData.password = await bcryptjs_1.default.hash(password, 10);
        }
        const updatedUser = await prisma.user.update({
            where: { id: Number(userId) },
            data: updateData,
        });
        res.status(200).json({
            message: "User updated successfully.",
            user: {
                id: updatedUser.id,
                fullName: updatedUser.fullName,
                email: updatedUser.email,
                phoneNumber: updatedUser.phoneNumber,
                role: updatedUser.role,
            },
        });
    }
    catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ message: "User not found." });
        }
        if (error.code === "P2002") {
            return res.status(409).json({
                message: "A user with this email or phone number already exists.",
            });
        }
        console.error(error);
        res.status(500).json({ message: "Internal server error." });
    }
};
exports.updateUser = updateUser;
// Create multiple voters
const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res
                .status(400)
                .json({ message: "Old password and new password are required." });
        }
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized." });
        }
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        // ✅ Compare old password
        const isOldPasswordValid = await bcryptjs_1.default.compare(oldPassword, user.password);
        if (!isOldPasswordValid) {
            return res.status(400).json({ message: "Old password is incorrect." });
        }
        // ✅ Hash the new password
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        // ✅ Update password and clear mustChangePassword flag
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                mustChangePassword: false,
            },
        });
        return res.json({
            message: "Password changed successfully. Please log in again.",
        });
    }
    catch (error) {
        console.error("Change password error:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};
exports.changePassword = changePassword;
// Generates a random password
function generateRandomPassword(length = 10) {
    return crypto_1.default.randomBytes(length).toString("base64").slice(0, length);
}
/**
 * Reset user password by Admin
 */
async function adminResetUserPassword(userId) {
    const newPasswordPlain = generateRandomPassword(10);
    // Hash password
    const hashedPassword = await bcryptjs_1.default.hash(newPasswordPlain, 10);
    // Update user in database
    await prisma.user.update({
        where: { id: userId },
        data: {
            password: hashedPassword,
            mustChangePassword: true,
            updatedAt: new Date(),
        },
    });
    // Return the plain password so admin can share it
    return newPasswordPlain;
}
