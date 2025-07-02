import axios from "axios";
import crypto from "crypto";

/**
 * Sends an SMS via Telesom API.
 *
 * @param to - Recipient phone number (e.g., +2526xxxxxxx)
 * @param message - Message to send
 * @returns Promise<string> - The response from Telesom API
 */
export async function sendTelesomSMS(
  to: string,
  message: string
): Promise<string> {
  const from: string | undefined = process.env.TELESOM_SENDER_ID;
  const username: string | undefined = process.env.TELESOM_USERNAME;
  const password: string | undefined = process.env.TELESOM_PASSWORD;
  const key: string | undefined = process.env.TELESOM_API_KEY;
  const telesomUrl: string | undefined = process.env.TELESOM_URL;

  // Check if any required env variable is missing
  if (!from || !username || !password || !key || !telesomUrl) {
    throw new Error(
      "Missing one or more Telesom configuration environment variables."
    );
  }

  const encodedMsg = encodeURIComponent(message);

  // Format date as dd/mm/yyyy
  const date = new Date().toLocaleDateString("en-GB").replace(/\//g, "/");

  // Create raw string for hashing
  const raw = `${username}|${password}|${to}|${encodedMsg}|${from}|${date}|${key}`;

  // Create MD5 hash and convert to uppercase
  const hashKey = crypto
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
  const response = await axios.post<string>(telesomUrl, params.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return response.data;
}
