"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
// src/prisma.ts
const client_1 = require("@prisma/client");
const globalForPrisma = global;
exports.prisma = (_a = globalForPrisma.prisma) !== null && _a !== void 0 ? _a : new client_1.PrismaClient({ log: ["error", "warn"] });
if (process.env.NODE_ENV !== "production")
    globalForPrisma.prisma = exports.prisma;
