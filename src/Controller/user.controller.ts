import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
const prisma = new PrismaClient();

export const register = async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, phoneNumber, role } = req.body;

    if (!fullName || !email || !password) {
      return res
        .status(400)
        .json({ message: "Full name, email, and password are required." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        fullName,
        email: email.toLowerCase(), // 👈 Fix here
        password: hashedPassword,
        phoneNumber,
        role: role ?? "USER",
      },
    });

    res.status(201).json({
      message: "User created successfully.",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({
        message: `A user with this email or phone number already exists.`,
      });
    }

    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
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
  } catch (error) {
    console.error("Get all users error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const getUserById = async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error("Get user by ID error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    await prisma.user.delete({ where: { id } });
    return res.json({ message: "User deleted successfully." });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const generateToken = (user: any) => {
  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );
};

export const login = async (req: Request, res: Response) => {
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

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: "Login successful.",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
      Access_token: token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const updateUser = async (req: Request, res: Response) => {
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
    const updateData: any = {};

    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email.toLowerCase();
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (role) updateData.role = role;

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
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
  } catch (error: any) {
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
// Create multiple voters
