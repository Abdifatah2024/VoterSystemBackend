// utils/normalizePhoneNumber.ts
export function normalizePhoneNumber(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, "");

  if (cleaned.startsWith("0")) {
    return "+252" + cleaned.substring(1);
  }
  if (cleaned.startsWith("252")) {
    return "+252" + cleaned.substring(3);
  }
  if (cleaned.startsWith("+252")) {
    return cleaned;
  }

  throw new Error(`Invalid phone format: "${raw}"`);
}
