import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";

/** 
 * ✅ Generate numeric OTP of a given length (default = 6)
 * Example output: "482930"
 */
export function generateNumericOtp(length = 6): string {
  const digits = "0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += digits[Math.floor(Math.random() * 10)];
  }
  return out;
}

/**
 * ✅ Hash OTP using bcrypt (for secure DB storage)
 */
export async function hashOtp(otp: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(otp, saltRounds);
}

/**
 * ✅ Compare raw OTP with stored bcrypt hash
 */
export async function compareOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

/**
 * ✅ Add N minutes to a Date (for expiry handling)
 */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/**
 * ✅ Send OTP via Gmail (uses EMAIL_USER & EMAIL_PASS environment vars)
 * Works with Gmail App Passwords or any SMTP provider.
 * Automatically retries via TLS 587 if SSL 465 fails.
 */
export async function sendOtpEmail(toEmail: string, code: string): Promise<void> {
  const user = (process.env.EMAIL_USER || process.env.SMTP_USER || "").trim();
  const pass = (process.env.EMAIL_PASS || process.env.SMTP_PASS || "").replace(/\s+/g, "");

  if (!user || !pass) {
    throw new Error("EMAIL_USER and EMAIL_PASS environment variables are required.");
  }

  // Create SMTP transporter (465 SSL)
  const makeTransport = (variant: "ssl" | "tls") =>
    variant === "ssl"
      ? nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: { user, pass },
          logger: process.env.NODE_ENV !== "production",
          debug: process.env.NODE_ENV !== "production",
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 20000,
          tls: { servername: "smtp.gmail.com" },
        })
      : nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          requireTLS: true,
          auth: { user, pass },
          logger: process.env.NODE_ENV !== "production",
          debug: process.env.NODE_ENV !== "production",
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 20000,
          tls: { servername: "smtp.gmail.com" },
        });

  let transporter = makeTransport("ssl");

  try {
    await transporter.verify(); // test connection
  } catch (err: any) {
    console.warn("SMTP 465 failed, retrying TLS 587:", err?.message);
    transporter = makeTransport("tls");
    await transporter.verify();
  }

  // Send email
  const info = await transporter.sendMail({
    from: `Muuse Dhimbiil System <${user}>`,
    to: toEmail,
    subject: "Your Muuse dhimbil system OTP Code",
    text: `Your verification code is ${code}. It expires in 5 minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:16px;background:#fff">
        <h2 style="margin-bottom:12px;color:#111827">Verify your login</h2>
        <p style="margin:0 0 16px;color:#374151">Use the code below to complete your login. It expires in <b>5 minutes</b>.</p>
        <div style="font-size:28px;letter-spacing:6px;font-weight:700;margin:16px 0;padding:12px 16px;background:#f3f4f6;border-radius:8px;text-align:center;color:#111827">
          ${code}
        </div>
        <p style="color:#6b7280;font-size:12px">If you did not request this code, you can safely ignore this email.</p>
      </div>
    `,
  });

  console.log("✅ OTP email sent successfully:", info.messageId, info.response);
}
