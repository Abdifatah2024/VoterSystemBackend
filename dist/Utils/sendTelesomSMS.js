"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTelesomSMS = sendTelesomSMS;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
/**
 * Sends an SMS via Telesom API.
 *
 * @param to - Recipient phone number (e.g., +2526xxxxxxx)
 * @param message - Message to send
 * @returns Promise<string> - The response from Telesom API
 */
async function sendTelesomSMS(to, message) {
    const from = process.env.TELESOM_SENDER_ID;
    const username = process.env.TELESOM_USERNAME;
    const password = process.env.TELESOM_PASSWORD;
    const key = process.env.TELESOM_API_KEY;
    const telesomUrl = process.env.TELESOM_URL;
    // Check if any required env variable is missing
    if (!from || !username || !password || !key || !telesomUrl) {
        throw new Error("Missing one or more Telesom configuration environment variables.");
    }
    const encodedMsg = encodeURIComponent(message);
    // Format date as dd/mm/yyyy
    const date = new Date().toLocaleDateString("en-GB").replace(/\//g, "/");
    // Create raw string for hashing
    const raw = `${username}|${password}|${to}|${encodedMsg}|${from}|${date}|${key}`;
    // Create MD5 hash and convert to uppercase
    const hashKey = crypto_1.default
        .createHash("md5")
        .update(raw)
        .digest("hex")
        .toUpperCase();
    // Prepare request body
    const params = new URLSearchParams({
        from,
        to,
        msg: encodedMsg,
        key: hashKey,
    });
    // Send POST request to Telesom
    const response = await axios_1.default.post(telesomUrl, params.toString(), {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });
    return response.data;
}
