// import { PrismaClient } from "@prisma/client";
// import { Request, Response } from "express";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// const prisma = new PrismaClient();
// import crypto from "crypto";
// import { AuthRequest } from "../middlewares/middlewares"; // Path to where you defined AuthRequest
// export const register = async (req: Request, res: Response) => {
//   try {
//     const { fullName, email, password, phoneNumber, role } = req.body;

//     if (!fullName || !email || !password) {
//       return res
//         .status(400)
//         .json({ message: "Full name, email, and password are required." });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const user = await prisma.user.create({
//       data: {
//         fullName,
//         email: email.toLowerCase(),
//         password: hashedPassword,
//         phoneNumber,
//         role: role ?? "USER",
//         mustChangePassword: true, // ✅ Require password change on first login
//       },
//     });

//     res.status(201).json({
//       message:
//         "User created successfully. User must change password at first login.",
//       user: {
//         id: user.id,
//         fullName: user.fullName,
//         email: user.email,
//         phoneNumber: user.phoneNumber,
//         role: user.role,
//         mustChangePassword: user.mustChangePassword,
//       },
//     });
//   } catch (error: any) {
//     if (error.code === "P2002") {
//       return res.status(409).json({
//         message: "A user with this email or phone number already exists.",
//       });
//     }

//     console.error(error);
//     res.status(500).json({ message: "Internal server error." });
//   }
// };

// export const getAllUsers = async (_req: Request, res: Response) => {
//   try {
//     const users = await prisma.user.findMany({
//       where: {
//         id: {
//           not: 1,
//         },
//       },
//       select: {
//         id: true,
//         fullName: true,
//         email: true,
//         phoneNumber: true,
//         role: true,
//         createdAt: true,
//         updatedAt: true,
//       },
//       orderBy: { createdAt: "desc" },
//     });
//     return res.json(users);
//   } catch (error) {
//     console.error("Get all users error:", error);
//     return res.status(500).json({ message: "Internal server error." });
//   }
// };

// export const getUserById = async (req: Request, res: Response) => {
//   try {
//     const id = Number(req.params.id);

//     const user = await prisma.user.findUnique({
//       where: { id },
//       select: {
//         id: true,
//         fullName: true,
//         email: true,
//         phoneNumber: true,
//         role: true,
//         createdAt: true,
//         updatedAt: true,
//       },
//     });

//     if (!user) {
//       return res.status(404).json({ message: "User not found." });
//     }

//     return res.json(user);
//   } catch (error) {
//     console.error("Get user by ID error:", error);
//     return res.status(500).json({ message: "Internal server error." });
//   }
// };

// export const deleteUser = async (req: Request, res: Response) => {
//   try {
//     const id = Number(req.params.id);

//     const user = await prisma.user.findUnique({ where: { id } });
//     if (!user) {
//       return res.status(404).json({ message: "User not found." });
//     }

//     await prisma.user.delete({ where: { id } });
//     return res.json({ message: "User deleted successfully." });
//   } catch (error) {
//     console.error("Delete user error:", error);
//     return res.status(500).json({ message: "Internal server error." });
//   }
// };

// export const generateToken = (user: any) => {
//   return jwt.sign(
//     { userId: user.id, role: user.role },
//     process.env.JWT_SECRET!,
//     { expiresIn: "30d" }
//   );
// };

// // export const login = async (req: Request, res: Response) => {
// //   try {
// //     const { email, password } = req.body;

// //     if (!email || !password) {
// //       return res
// //         .status(400)
// //         .json({ message: "Email and password are required." });
// //     }

// //     const user = await prisma.user.findUnique({
// //       where: { email: email.toLowerCase() },
// //     });

// //     if (!user) {
// //       return res.status(401).json({ message: "Incorrect email or password." });
// //     }

// //     const isPasswordValid = await bcrypt.compare(password, user.password);

// //     if (!isPasswordValid) {
// //       return res.status(401).json({ message: "Incorrect email or password." });
// //     }

// //     // ✅ Always generate the token
// //     const token = generateToken(user);

// //     // ✅ Always return the token, even if must change password
// //     return res.status(200).json({
// //       message: user.mustChangePassword
// //         ? "Password change required before logging in."
// //         : "Login successful.",
// //       requirePasswordChange: user.mustChangePassword,
// //       Access_token: token, // <-- THIS IS WHAT YOU ARE MISSING
// //       user: {
// //         id: user.id,
// //         email: user.email,
// //         fullName: user.fullName,
// //         role: user.role,
// //       },
// //     });
// //   } catch (error) {
// //     console.error("Login error:", error);
// //     return res.status(500).json({ message: "Internal server error." });
// //   }
// // };


// import { PrismaClient, OtpPurpose, OtpChannel } from "@prisma/client";
// import { generateNumericOtp, hashOtp, addMinutes, sendOtpEmail } from "../lib/otpEmailHelpers"; // your helper file
// import { generateToken } from "../Utils/jwt"; // your existing JWT util



// /**
//  * Login: verify password → send OTP to email → require verification before issuing final JWT.
//  */
// export const login = async (req: Request, res: Response) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({ message: "Email and password are required." });
//     }

//     // 🔹 Find user
//     const user = await prisma.user.findUnique({
//       where: { email: email.toLowerCase() },
//     });

//     if (!user) {
//       return res.status(401).json({ message: "Incorrect email or password." });
//     }

//     // 🔹 Validate password
//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) {
//       return res.status(401).json({ message: "Incorrect email or password." });
//     }

//     // 🔹 Remove any previous unexpired OTPs
//     await prisma.oneTimePassword.deleteMany({
//       where: {
//         userId: user.id,
//         purpose: OtpPurpose.LOGIN,
//         consumedAt: null,
//         expiresAt: { gt: new Date() },
//       },
//     });

//     // 🔹 Generate new OTP
//     const otpCode = generateNumericOtp(6);
//     const otpHash = await hashOtp(otpCode);

//     await prisma.oneTimePassword.create({
//       data: {
//         userId: user.id,
//         purpose: OtpPurpose.LOGIN,
//         channel: OtpChannel.EMAIL,
//         destination: user.email,
//         codeHash: otpHash,
//         expiresAt: addMinutes(new Date(), 5), // expires in 5 min
//         lastSentAt: new Date(),
//       },
//     });

//     // 🔹 Send OTP via Gmail
//     await sendOtpEmail(user.email, otpCode);

//     // 🚫 Do not return JWT yet — wait for OTP verification
//     return res.status(200).json({
//       message: "OTP sent to your email. Please verify to complete login.",
//       email: user.email,
//     });
//   } catch (error) {
//     console.error("Login error:", error);
//     return res.status(500).json({ message: "Internal server error." });
//   }
// };

// export const updateUser = async (req: Request, res: Response) => {
//   try {
//     // Make sure the user is authenticated
//     //@ts-ignore
//     if (!req.user) {
//       return res.status(401).json({ message: "Unauthorized." });
//     }

//     // Check if the user has ADMIN role
//     //@ts-ignore
//     if (req.user.role !== "ADMIN") {
//       return res.status(403).json({ message: "Only admins can update users." });
//     }

//     const { userId } = req.params;
//     const { fullName, email, password, phoneNumber, role } = req.body;

//     if (!userId) {
//       return res.status(400).json({ message: "User ID is required." });
//     }

//     // Prepare update data
//     const updateData: any = {};

//     if (fullName) updateData.fullName = fullName;
//     if (email) updateData.email = email.toLowerCase();
//     if (phoneNumber) updateData.phoneNumber = phoneNumber;
//     if (role) updateData.role = role;

//     if (password) {
//       updateData.password = await bcrypt.hash(password, 10);
//     }

//     const updatedUser = await prisma.user.update({
//       where: { id: Number(userId) },
//       data: updateData,
//     });

//     res.status(200).json({
//       message: "User updated successfully.",
//       user: {
//         id: updatedUser.id,
//         fullName: updatedUser.fullName,
//         email: updatedUser.email,
//         phoneNumber: updatedUser.phoneNumber,
//         role: updatedUser.role,
//       },
//     });
//   } catch (error: any) {
//     if (error.code === "P2025") {
//       return res.status(404).json({ message: "User not found." });
//     }
//     if (error.code === "P2002") {
//       return res.status(409).json({
//         message: "A user with this email or phone number already exists.",
//       });
//     }

//     console.error(error);
//     res.status(500).json({ message: "Internal server error." });
//   }
// };
// // Create multiple voters

// export const changePassword = async (req: AuthRequest, res: Response) => {
//   try {
//     const { oldPassword, newPassword } = req.body;

//     if (!oldPassword || !newPassword) {
//       return res
//         .status(400)
//         .json({ message: "Old password and new password are required." });
//     }

//     if (!req.user) {
//       return res.status(401).json({ message: "Unauthorized." });
//     }

//     const user = await prisma.user.findUnique({
//       where: { id: req.user.id },
//     });

//     if (!user) {
//       return res.status(404).json({ message: "User not found." });
//     }

//     // ✅ Compare old password
//     const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
//     if (!isOldPasswordValid) {
//       return res.status(400).json({ message: "Old password is incorrect." });
//     }

//     // ✅ Hash the new password
//     const hashedPassword = await bcrypt.hash(newPassword, 10);

//     // ✅ Update password and clear mustChangePassword flag
//     await prisma.user.update({
//       where: { id: user.id },
//       data: {
//         password: hashedPassword,
//         mustChangePassword: false,
//       },
//     });

//     return res.json({
//       message: "Password changed successfully. Please log in again.",
//     });
//   } catch (error) {
//     console.error("Change password error:", error);
//     return res.status(500).json({ message: "Internal server error." });
//   }
// };

// // Generates a random password
// function generateRandomPassword(length: number = 10): string {
//   return crypto.randomBytes(length).toString("base64").slice(0, length);
// }

// /**
//  * Reset user password by Admin
//  */
// export async function adminResetUserPassword(userId: number) {
//   const newPasswordPlain = generateRandomPassword(10);

//   // Hash password
//   const hashedPassword = await bcrypt.hash(newPasswordPlain, 10);

//   // Update user in database
//   await prisma.user.update({
//     where: { id: userId },
//     data: {
//       password: hashedPassword,
//       mustChangePassword: true,
//       updatedAt: new Date(),
//     },
//   });

//   // Return the plain password so admin can share it
//   return newPasswordPlain;
// }
// src/controllers/user.controller.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { PrismaClient, OtpPurpose, OtpChannel } from "@prisma/client";
import { AuthRequest } from "../middlewares/middlewares"; // keep if correct
import {
  generateNumericOtp,
  hashOtp,
  addMinutes,
  sendOtpEmail,
} from "../lib/otpEmailHelpers";
import { generateToken } from "../Utils/jwt"; // ✅ use the util; do NOT redeclare locally

const prisma = new PrismaClient();

/* ===================== REGISTER ===================== */
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
        email: email.toLowerCase(),
        password: hashedPassword,
        phoneNumber,
        role: role ?? "USER",
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
      message:
        "User created successfully. User must change password at first login.",
      user,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "A user with this email or phone number already exists.",
      });
    }
    console.error("Register error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/* ===================== LIST/GET/DELETE ===================== */
export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
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
  } catch (error) {
    console.error("Get all users error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

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

    if (!user) return res.status(404).json({ message: "User not found." });
    return res.json(user);
  } catch (error) {
    console.error("Get user by ID error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const exists = await prisma.user.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ message: "User not found." });

    await prisma.user.delete({ where: { id } });
    return res.json({ message: "User deleted successfully." });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/* ===================== LOGIN (PASSWORD → SEND OTP) ===================== */
// export const login = async (req: Request, res: Response) => {
//   try {
//     const { email, password } = req.body as { email?: string; password?: string };

//     if (!email || !password) {
//       return res.status(400).json({ message: "Email and password are required." });
//     }

//     const user = await prisma.user.findUnique({
//       where: { email: email.toLowerCase() },
//     });

//     if (!user) {
//       return res.status(401).json({ message: "Incorrect email or password." });
//     }

//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) {
//       return res.status(401).json({ message: "Incorrect email or password." });
//     }

//     // Remove any previous unexpired OTPs for LOGIN
//     await prisma.oneTimePassword.deleteMany({
//       where: {
//         userId: user.id,
//         purpose: OtpPurpose.LOGIN,
//         consumedAt: null,
//         expiresAt: { gt: new Date() },
//       },
//     });

//     // Generate and persist OTP
//     const otpCode = generateNumericOtp(6);
//     const otpHash = await hashOtp(otpCode);

//     await prisma.oneTimePassword.create({
//       data: {
//         userId: user.id,
//         purpose: OtpPurpose.LOGIN,
//         channel: OtpChannel.EMAIL,
//         destination: user.email,
//         codeHash: otpHash,
//         expiresAt: addMinutes(new Date(), 5),
//         lastSentAt: new Date(),
//       },
//     });

//     // Send via email
//     await sendOtpEmail(user.email, otpCode);

//     // Do not return JWT yet — wait for OTP verification
//     return res.status(200).json({
//       message: "OTP sent to your email. Please verify to complete login.",
//       email: user.email,
//       requirePasswordChange: user.mustChangePassword, // for UI
//     });
//   } catch (error) {
//     console.error("Login error:", error);
//     return res.status(500).json({ message: "Internal server error." });
//   }
// };


export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    // Remove any previous unexpired OTPs for LOGIN
    await prisma.oneTimePassword.deleteMany({
      where: {
        userId: user.id,
        purpose: OtpPurpose.LOGIN,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    // Generate and persist OTP
    const otpCode = generateNumericOtp(6);
    const otpHash = await hashOtp(otpCode);

    const created = await prisma.oneTimePassword.create({
      data: {
        userId: user.id,
        purpose: OtpPurpose.LOGIN,
        channel: OtpChannel.EMAIL,
        destination: user.email,
        codeHash: otpHash,
        // UTC-safe expiry (avoid timezone surprises)
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        lastSentAt: new Date(),
      },
      select: { id: true, expiresAt: true },
    });

    // Send via email
    await sendOtpEmail(user.email, otpCode);

    // Do not return JWT yet — wait for OTP verification
    return res.status(200).json({
      message: "OTP sent to your email. Please verify to complete login.",
      email: user.email,
      otpId: created.id,               // ✅ return this to verify precisely
      expiresAt: created.expiresAt,    // (for UI countdown)
      requirePasswordChange: user.mustChangePassword,
      ...(process.env.NODE_ENV !== "production" ? { devCode: otpCode } : {}),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/* ===================== UPDATE (ADMIN ONLY) ===================== */
export const updateUser = async (req: Request, res: Response) => {
  try {
    // @ts-ignore (populated by your auth middleware)
    if (!req.user) return res.status(401).json({ message: "Unauthorized." });
    // @ts-ignore
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only admins can update users." });
    }

    const { userId } = req.params;
    const id = Number(userId);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const { fullName, email, password, phoneNumber, role } = req.body as {
      fullName?: string;
      email?: string;
      password?: string;
      phoneNumber?: string;
      role?: string;
    };

    const data: Record<string, any> = {};
    if (fullName) data.fullName = fullName;
    if (email) data.email = email.toLowerCase();
    if (phoneNumber) data.phoneNumber = phoneNumber;
    if (role) data.role = role;
    if (password) data.password = await bcrypt.hash(password, 10);

    const updated = await prisma.user.update({ where: { id }, data });

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
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "User not found." });
    }
    if (error.code === "P2002") {
      return res
        .status(409)
        .json({ message: "A user with this email or phone number already exists." });
    }
    console.error("Update user error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/* ===================== CHANGE PASSWORD (SELF) ===================== */
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body as {
      oldPassword?: string;
      newPassword?: string;
    };

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Old password and new password are required." });
    }
    if (!req.user) return res.status(401).json({ message: "Unauthorized." });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: "User not found." });

    const isOldValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldValid) {
      return res.status(400).json({ message: "Old password is incorrect." });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, mustChangePassword: false },
    });

    return res.json({
      message: "Password changed successfully. Please log in again.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/* ===================== ADMIN RESET PASSWORD (UTILITY) ===================== */
function generateRandomPassword(length = 10): string {
  return crypto.randomBytes(length).toString("base64").slice(0, length);
}

export async function adminResetUserPassword(userId: number) {
  const newPasswordPlain = generateRandomPassword(10);
  const hashedPassword = await bcrypt.hash(newPasswordPlain, 10);

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      mustChangePassword: true,
      updatedAt: new Date(),
    },
  });

  return newPasswordPlain; // admin can share securely with the user
}
