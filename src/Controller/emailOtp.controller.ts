import { Request, Response } from "express";
import { PrismaClient, OtpPurpose, OtpChannel } from "@prisma/client";
import {
  generateNumericOtp,
  hashOtp,
  compareOtp,
  addMinutes,        // still available if you prefer, but we’ll use Date.now() below
  sendOtpEmail,
} from "../lib/otpEmailHelpers";
import { generateToken } from "../Utils/jwt";

const prisma = new PrismaClient();

const OTP_EXP_MIN = 5;  // minutes
const MAX_RESENDS = 3;  // per active OTP
const MAX_ATTEMPTS = 5; // per OTP

function normalizeEmail(email?: string | null) {
  return (email ?? "").trim().toLowerCase();
}

/**
 * POST /api/otp/email/request
 * body: { email: string, purpose?: 'LOGIN' | 'PASSWORD_RESET' | 'MFA' }
 */
export const requestEmailOtp = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const purposeKey = (req.body?.purpose as keyof typeof OtpPurpose) || "LOGIN";
    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found." });

    // Keep only one active OTP per (user,purpose)
    await prisma.oneTimePassword.deleteMany({
      where: {
        userId: user.id,
        purpose: OtpPurpose[purposeKey],
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    const code = generateNumericOtp(6);
    const codeHash = await hashOtp(code);

    const created = await prisma.oneTimePassword.create({
      data: {
        userId: user.id,
        purpose: OtpPurpose[purposeKey],
        channel: OtpChannel.EMAIL,
        destination: email,
        codeHash,
        // UTC-safe expiry
        expiresAt: new Date(Date.now() + OTP_EXP_MIN * 60 * 1000),
        lastSentAt: new Date(),
      },
      select: { id: true, destination: true, purpose: true, channel: true, resendCount: true, expiresAt: true },
    });

    await sendOtpEmail(email, code);

    return res.status(200).json({
      message: "OTP sent to email.",
      otp: { id: created.id, expiresAt: created.expiresAt },
      ...(process.env.NODE_ENV !== "production" ? { devCode: code } : {}),
    });
  } catch (err: any) {
    console.error("requestEmailOtp error:", err?.message || err);
    return res.status(500).json({ message: "Server error sending OTP." });
  }
};

/**
 * POST /api/otp/email/verify
 * body: { email: string, code: string, purpose?: 'LOGIN' | 'PASSWORD_RESET' | 'MFA', otpId?: number }
 */
export const verifyEmailOtp = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || "");
    const otpId = req.body?.otpId ? Number(req.body.otpId) : undefined;
    const purposeKey = (req.body?.purpose as keyof typeof OtpPurpose) || "LOGIN";

    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required." });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found." });

    // Prefer exact OTP by id
    let otp = otpId
      ? await prisma.oneTimePassword.findUnique({ where: { id: otpId } })
      : null;

    // Fallback: latest active OTP for this user+purpose
    if (!otp) {
      otp = await prisma.oneTimePassword.findFirst({
        where: {
          userId: user.id,
          purpose: OtpPurpose[purposeKey],
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!otp) {
      return res.status(400).json({ message: "No active OTP or it has expired." });
    }

    // Must belong to same user & purpose
    if (otp.userId !== user.id || otp.purpose !== OtpPurpose[purposeKey]) {
      return res.status(400).json({ message: "OTP does not match this request." });
    }

    if (otp.consumedAt) {
      return res.status(400).json({ message: "OTP already used. Request a new one." });
    }

    if (otp.expiresAt <= new Date()) {
      return res.status(400).json({ message: "OTP expired. Request a new one." });
    }

    if (otp.attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({ message: "Too many attempts. Request a new OTP." });
    }

    // Count attempt before compare
    await prisma.oneTimePassword.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });

    const ok = await compareOtp(code, otp.codeHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid code." });
    }

    // Success: mark consumed
    await prisma.oneTimePassword.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    // ✅ Issue JWT (this is the big addition you wanted)
    const Access_token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    return res.status(200).json({
      message: "OTP verified. Login successful.",
      Access_token,
      requirePasswordChange: user.mustChangePassword,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error("verifyEmailOtp error:", err?.message || err);
    return res.status(500).json({ message: "Server error verifying OTP." });
  }
};

/**
 * POST /api/otp/email/resend
 * body: { email: string, purpose?: 'LOGIN' | 'PASSWORD_RESET' | 'MFA' }
 */
export const resendEmailOtp = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const purposeKey = (req.body?.purpose as keyof typeof OtpPurpose) || "LOGIN";
    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found." });

    // Try to reuse the latest active OTP
    const existing = await prisma.oneTimePassword.findFirst({
      where: {
        userId: user.id,
        purpose: OtpPurpose[purposeKey],
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      if (existing.resendCount >= MAX_RESENDS) {
        return res.status(429).json({ message: "Resend limit reached. Please request a new OTP later." });
      }

      const newCode = generateNumericOtp(6);
      const newHash = await hashOtp(newCode);

      const updated = await prisma.oneTimePassword.update({
        where: { id: existing.id },
        data: {
          codeHash: newHash,
          resendCount: { increment: 1 },
          lastSentAt: new Date(),
          // extend expiry in a UTC-safe way
          expiresAt: new Date(Date.now() + OTP_EXP_MIN * 60 * 1000),
        },
        select: { id: true, destination: true, purpose: true, channel: true, resendCount: true, expiresAt: true },
      });

      await sendOtpEmail(email, newCode);

      return res.status(200).json({
        message: "OTP resent.",
        otp: { id: updated.id, expiresAt: updated.expiresAt, resendCount: updated.resendCount },
        ...(process.env.NODE_ENV !== "production" ? { devCode: newCode } : {}),
      });
    }

    // No active OTP → create a new one
    const code = generateNumericOtp(6);
    const codeHash = await hashOtp(code);

    const created = await prisma.oneTimePassword.create({
      data: {
        userId: user.id,
        purpose: OtpPurpose[purposeKey],
        channel: OtpChannel.EMAIL,
        destination: email,
        codeHash,
        expiresAt: new Date(Date.now() + OTP_EXP_MIN * 60 * 1000),
        lastSentAt: new Date(),
      },
      select: { id: true, destination: true, purpose: true, channel: true, resendCount: true, expiresAt: true },
    });

    await sendOtpEmail(email, code);

    return res.status(200).json({
      message: "OTP sent.",
      otp: { id: created.id, expiresAt: created.expiresAt },
      ...(process.env.NODE_ENV !== "production" ? { devCode: code } : {}),
    });
  } catch (err: any) {
    console.error("resendEmailOtp error:", err?.message || err);
    return res.status(500).json({ message: "Server error resending OTP." });
  }
};
