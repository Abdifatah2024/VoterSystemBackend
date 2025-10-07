// // src/controllers/otp.controller.ts
// import { Request, Response } from "express";
// import crypto from "crypto";
// import { OtpPurpose, OtpChannel } from "@prisma/client";
// import { prisma } from "../prisma";
// import {
//   generateNumericOtp,
//   hashOtp,
//   compareOtp,
//   sendOtpEmail,
// } from "../lib/otpEmailHelpers";
// import { generateToken } from "../Utils/jwt";

// /** Config */
// const OTP_EXP_MIN = 5;   // minutes
// const MAX_RESENDS = 3;   // per active OTP
// const MAX_ATTEMPTS = 5;  // per OTP

// /** Helpers */
// function normalizeEmail(email?: string | null) {
//   return (email ?? "").trim().toLowerCase();
// }
// function getDeviceMeta(req: Request) {
//   const deviceId = (req.header("x-device-id") || "") || crypto.randomUUID();
//   const userAgent = req.header("user-agent") || "unknown";
//   const ip =
//     (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
//     req.socket.remoteAddress ||
//     "";
//   return { deviceId, userAgent, ip };
// }

// /**
//  * POST /api/otp/email/request
//  * body: { email: string, purpose?: 'LOGIN' | 'PASSWORD_RESET' | 'MFA' }
//  */
// export const requestEmailOtp = async (req: Request, res: Response) => {
//   try {
//     const email = normalizeEmail(req.body?.email);
//     const purposeKey = (req.body?.purpose as keyof typeof OtpPurpose) || "LOGIN";
//     if (!email) return res.status(400).json({ message: "Email is required." });

//     const user = await prisma.user.findUnique({ where: { email } });
//     if (!user) return res.status(404).json({ message: "User not found." });

//     // Keep only one active OTP per (user,purpose)
//     await prisma.oneTimePassword.deleteMany({
//       where: {
//         userId: user.id,
//         purpose: OtpPurpose[purposeKey],
//         consumedAt: null,
//         expiresAt: { gt: new Date() },
//       },
//     });

//     const code = generateNumericOtp(6);
//     const codeHash = await hashOtp(code);

//     const created = await prisma.oneTimePassword.create({
//       data: {
//         userId: user.id,
//         purpose: OtpPurpose[purposeKey],
//         channel: OtpChannel.EMAIL,
//         destination: email,
//         codeHash,
//         expiresAt: new Date(Date.now() + OTP_EXP_MIN * 60 * 1000),
//         lastSentAt: new Date(),
//       },
//       select: { id: true, expiresAt: true },
//     });

//     await sendOtpEmail(email, code);

//     return res.status(200).json({
//       message: "OTP sent to email.",
//       otp: { id: created.id, expiresAt: created.expiresAt },
//       ...(process.env.NODE_ENV !== "production" ? { devCode: code } : {}),
//     });
//   } catch (err: any) {
//     console.error("requestEmailOtp error:", err?.message || err);
//     return res.status(500).json({ message: "Server error sending OTP." });
//   }
// };

// /**
//  * POST /api/otp/email/verify
//  * body: { email: string, code: string, purpose?: 'LOGIN' | 'PASSWORD_RESET' | 'MFA', otpId?: number }
//  *
//  * ✅ Creates a Session, returns JWT with sessionId (required by your auth middleware)
//  */
// export const verifyEmailOtp = async (req: Request, res: Response) => {
//   try {
//     const email = normalizeEmail(req.body?.email);
//     const code = String(req.body?.code || "");
//     const otpId = req.body?.otpId ? Number(req.body.otpId) : undefined;
//     const purposeKey = (req.body?.purpose as keyof typeof OtpPurpose) || "LOGIN";

//     if (!email || !code) {
//       return res.status(400).json({ message: "Email and code are required." });
//     }

//     const user = await prisma.user.findUnique({ where: { email } });
//     if (!user) return res.status(404).json({ message: "User not found." });

//     // Prefer exact OTP by id, else latest active OTP
//     let otp = otpId
//       ? await prisma.oneTimePassword.findUnique({ where: { id: otpId } })
//       : null;

//     if (!otp) {
//       otp = await prisma.oneTimePassword.findFirst({
//         where: {
//           userId: user.id,
//           purpose: OtpPurpose[purposeKey],
//           consumedAt: null,
//           expiresAt: { gt: new Date() },
//         },
//         orderBy: { createdAt: "desc" },
//       });
//     }

//     if (!otp) return res.status(400).json({ message: "No active OTP or it has expired." });
//     if (otp.userId !== user.id || otp.purpose !== OtpPurpose[purposeKey]) {
//       return res.status(400).json({ message: "OTP does not match this request." });
//     }
//     if (otp.consumedAt) return res.status(400).json({ message: "OTP already used. Request a new one." });
//     if (otp.expiresAt <= new Date()) return res.status(400).json({ message: "OTP expired. Request a new one." });
//     if (otp.attempts >= MAX_ATTEMPTS) {
//       return res.status(429).json({ message: "Too many attempts. Request a new OTP." });
//     }

//     // Count attempt before compare (rate-limit)
//     await prisma.oneTimePassword.update({
//       where: { id: otp.id },
//       data: { attempts: { increment: 1 } },
//     });

//     const ok = await compareOtp(code, otp.codeHash);
//     if (!ok) return res.status(401).json({ message: "Invalid code." });

//     // Mark consumed
//     await prisma.oneTimePassword.update({
//       where: { id: otp.id },
//       data: { consumedAt: new Date() },
//     });

//     // SINGLE-DEVICE POLICY: revoke existing sessions, then create a new one
//     const { deviceId, userAgent, ip } = getDeviceMeta(req);
//     const session = await prisma.$transaction(async (tx) => {
//       await tx.session.updateMany({
//         where: { userId: user.id, revokedAt: null },
//         data: { revokedAt: new Date() },
//       });
//       return tx.session.create({
//         data: { userId: user.id, deviceId, userAgent, ip },
//       });
//     });

//     // 🔑 include sessionId in JWT (middleware requires this)
//     const token = generateToken({
//       id: user.id,
//       email: user.email,
//       role: user.role,
//       fullName: user.fullName,
//       sessionId: session.id,
//     });

//     return res.status(200).json({
//       message: "OTP verified. Login successful.",
//       token,                 // standard key
//       Access_token: token,   // compatibility if frontend expects this
//       requirePasswordChange: user.mustChangePassword,
//       user: {
//         id: user.id,
//         fullName: user.fullName,
//         email: user.email,
//         phoneNumber: user.phoneNumber,
//         role: user.role,
//       },
//       session: {
//         id: session.id,
//         deviceId: session.deviceId,
//         createdAt: session.createdAt,
//       },
//     });
//   } catch (err: any) {
//     console.error("verifyEmailOtp error:", err?.message || err);
//     return res.status(500).json({ message: "Server error verifying OTP." });
//   }
// };

// /**
//  * POST /api/otp/email/resend
//  * body: { email: string, purpose?: 'LOGIN' | 'PASSWORD_RESET' | 'MFA' }
//  */
// export const resendEmailOtp = async (req: Request, res: Response) => {
//   try {
//     const email = normalizeEmail(req.body?.email);
//     const purposeKey = (req.body?.purpose as keyof typeof OtpPurpose) || "LOGIN";
//     if (!email) return res.status(400).json({ message: "Email is required." });

//     const user = await prisma.user.findUnique({ where: { email } });
//     if (!user) return res.status(404).json({ message: "User not found." });

//     // Try to reuse latest active OTP
//     const existing = await prisma.oneTimePassword.findFirst({
//       where: {
//         userId: user.id,
//         purpose: OtpPurpose[purposeKey],
//         consumedAt: null,
//         expiresAt: { gt: new Date() },
//       },
//       orderBy: { createdAt: "desc" },
//     });

//     if (existing) {
//       if (existing.resendCount >= MAX_RESENDS) {
//         return res.status(429).json({ message: "Resend limit reached. Please request a new OTP later." });
//       }

//       const newCode = generateNumericOtp(6);
//       const newHash = await hashOtp(newCode);

//       const updated = await prisma.oneTimePassword.update({
//         where: { id: existing.id },
//         data: {
//           codeHash: newHash,
//           resendCount: { increment: 1 },
//           lastSentAt: new Date(),
//           expiresAt: new Date(Date.now() + OTP_EXP_MIN * 60 * 1000),
//         },
//         select: { id: true, resendCount: true, expiresAt: true },
//       });

//       await sendOtpEmail(email, newCode);

//       return res.status(200).json({
//         message: "OTP resent.",
//         otp: { id: updated.id, expiresAt: updated.expiresAt, resendCount: updated.resendCount },
//         ...(process.env.NODE_ENV !== "production" ? { devCode: newCode } : {}),
//       });
//     }

//     // Otherwise create a new OTP
//     const code = generateNumericOtp(6);
//     const codeHash = await hashOtp(code);

//     const created = await prisma.oneTimePassword.create({
//       data: {
//         userId: user.id,
//         purpose: OtpPurpose[purposeKey],
//         channel: OtpChannel.EMAIL,
//         destination: email,
//         codeHash,
//         expiresAt: new Date(Date.now() + OTP_EXP_MIN * 60 * 1000),
//         lastSentAt: new Date(),
//       },
//       select: { id: true, expiresAt: true },
//     });

//     await sendOtpEmail(email, code);

//     return res.status(200).json({
//       message: "OTP sent.",
//       otp: { id: created.id, expiresAt: created.expiresAt },
//       ...(process.env.NODE_ENV !== "production" ? { devCode: code } : {}),
//     });
//   } catch (err: any) {
//     console.error("resendEmailOtp error:", err?.message || err);
//     return res.status(500).json({ message: "Server error resending OTP." });
//   }
// };

// /**
//  * GET /api/auth/ping
//  * Mount this with `authenticate` so it returns 401 if session is revoked.
//  */
// export const ping = (_req: Request, res: Response) => {
//   return res.json({ ok: true });
// };
// src/controllers/otp.controller.ts
import { Request, Response } from "express";
import crypto from "crypto";
import { OtpPurpose, OtpChannel } from "@prisma/client";
import { prisma } from "../prisma";
import {
  generateNumericOtp,
  hashOtp,
  compareOtp,
  sendOtpEmail,
} from "../lib/otpEmailHelpers";
import { generateToken } from "../Utils/jwt";

/** Config */
const OTP_EXP_MIN = 5;   // minutes
const MAX_RESENDS = 3;   // per active OTP
const MAX_ATTEMPTS = 5;  // per OTP

/** Helpers */
function normalizeEmail(email?: string | null) {
  return (email ?? "").trim().toLowerCase();
}
function getDeviceMeta(req: Request) {
  const deviceId = (req.header("x-device-id") || "") || crypto.randomUUID();
  const userAgent = req.header("user-agent") || "unknown";
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "";
  return { deviceId, userAgent, ip };
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
        expiresAt: new Date(Date.now() + OTP_EXP_MIN * 60 * 1000),
        lastSentAt: new Date(),
      },
      select: { id: true, expiresAt: true },
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
 *
 * ✅ Creates/rehydrates a Session and returns JWT with sessionId (required by auth middleware)
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

    // Prefer exact OTP by id, else latest active OTP
    let otp = otpId
      ? await prisma.oneTimePassword.findUnique({ where: { id: otpId } })
      : null;

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

    if (!otp) return res.status(400).json({ message: "No active OTP or it has expired." });
    if (otp.userId !== user.id || otp.purpose !== OtpPurpose[purposeKey]) {
      return res.status(400).json({ message: "OTP does not match this request." });
    }
    if (otp.consumedAt) return res.status(400).json({ message: "OTP already used. Request a new one." });
    if (otp.expiresAt <= new Date()) return res.status(400).json({ message: "OTP expired. Request a new one." });
    if (otp.attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({ message: "Too many attempts. Request a new OTP." });
    }

    // Count attempt before compare (rate-limit)
    await prisma.oneTimePassword.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });

    const ok = await compareOtp(code, otp.codeHash);
    if (!ok) return res.status(401).json({ message: "Invalid code." });

    // Mark consumed
    await prisma.oneTimePassword.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    // === SESSION POLICY ==========================================
    // Same IP → reuse existing active session (no logout on same IP)
    // Different IP → delete ALL old sessions and create exactly ONE fresh session
    const { deviceId, userAgent, ip } = getDeviceMeta(req);
    let sessionId = "";

    await prisma.$transaction(async (tx) => {
      // Try to find an active session from the same IP
      const sameIp = await tx.session.findFirst({
        where: { userId: user.id, revokedAt: null, ip },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      if (sameIp) {
        // Reuse same-IP session
        await tx.session.update({
          where: { id: sameIp.id },
          data: {
            deviceId,
            userAgent,
            // lastActiveAt will bump automatically if you have @updatedAt on it
          },
        });
        sessionId = sameIp.id;

        // Delete EVERYTHING else to keep only 1 row total
        await tx.session.deleteMany({
          where: { userId: user.id, id: { not: sessionId } },
        });
      } else {
        // Different IP (or no active session): wipe then create one
        await tx.session.deleteMany({ where: { userId: user.id } });
        const created = await tx.session.create({
          data: { userId: user.id, deviceId, userAgent, ip },
          select: { id: true },
        });
        sessionId = created.id;
      }
    });
    // =============================================================

    // 🔑 include sessionId in JWT (middleware requires this)
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      sessionId, // <- IMPORTANT
    });

    return res.status(200).json({
      message: "OTP verified. Login successful.",
      token,                 // standard key
      Access_token: token,   // compatibility if frontend expects this
      requirePasswordChange: user.mustChangePassword,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
      session: { id: sessionId },
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

    // Try to reuse latest active OTP
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
          expiresAt: new Date(Date.now() + OTP_EXP_MIN * 60 * 1000),
        },
        select: { id: true, resendCount: true, expiresAt: true },
      });

      await sendOtpEmail(email, newCode);

      return res.status(200).json({
        message: "OTP resent.",
        otp: { id: updated.id, expiresAt: updated.expiresAt, resendCount: updated.resendCount },
        ...(process.env.NODE_ENV !== "production" ? { devCode: newCode } : {}),
      });
    }

    // Otherwise create a new OTP
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
      select: { id: true, expiresAt: true },
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

/**
 * GET /api/auth/ping
 * Mount this with `authenticate` so it returns 401 if session is revoked/deleted.
 */
export const ping = (_req: Request, res: Response) => {
  return res.json({ ok: true });
};
