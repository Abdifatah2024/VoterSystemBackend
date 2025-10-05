"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNumericOtp = generateNumericOtp;
exports.hashOtp = hashOtp;
exports.compareOtp = compareOtp;
exports.addMinutes = addMinutes;
exports.sendOtpEmail = sendOtpEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
/**
 * ✅ Generate numeric OTP of a given length (default = 6)
 * Example output: "482930"
 */
function generateNumericOtp(length = 6) {
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
async function hashOtp(otp) {
    const saltRounds = 10;
    return bcryptjs_1.default.hash(otp, saltRounds);
}
/**
 * ✅ Compare raw OTP with stored bcrypt hash
 */
async function compareOtp(otp, hash) {
    return bcryptjs_1.default.compare(otp, hash);
}
/**
 * ✅ Add N minutes to a Date (for expiry handling)
 */
function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60 * 1000);
}
/**
 * ✅ Send OTP via Gmail (uses EMAIL_USER & EMAIL_PASS environment vars)
 * Works with Gmail App Passwords or any SMTP provider.
 * Automatically retries via TLS 587 if SSL 465 fails.
 */
async function sendOtpEmail(toEmail, code) {
    const user = (process.env.EMAIL_USER || process.env.SMTP_USER || "").trim();
    const pass = (process.env.EMAIL_PASS || process.env.SMTP_PASS || "").replace(/\s+/g, "");
    if (!user || !pass) {
        throw new Error("EMAIL_USER and EMAIL_PASS environment variables are required.");
    }
    // Create SMTP transporter (465 SSL)
    const makeTransport = (variant) => variant === "ssl"
        ? nodemailer_1.default.createTransport({
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
        : nodemailer_1.default.createTransport({
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
    }
    catch (err) {
        console.warn("SMTP 465 failed, retrying TLS 587:", err === null || err === void 0 ? void 0 : err.message);
        transporter = makeTransport("tls");
        await transporter.verify();
    }
    // Send email
    const info = await transporter.sendMail({
        from: `Muuse Dhimbiil System <${user}>`,
        to: toEmail,
        subject: "Your Horyaal OTP Code",
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
