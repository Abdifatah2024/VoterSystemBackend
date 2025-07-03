"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePhoneNumber = normalizePhoneNumber;
// utils/normalizePhoneNumber.ts
function normalizePhoneNumber(raw) {
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
