"use strict";
// import express, { Request, Response, NextFunction } from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import userRoutes from "./Routes/userRoute";
// import voterRoutes from "./Routes/voter.routes";
// import emailOtpRoutes from "./Routes/emailOtp.routes";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// dotenv.config();
// const app = express();
// /** Allowed frontends (no spaces, exact origins) */
// const ALLOWED_ORIGINS = new Set<string>([
//   "https://dhimbiil.online",
//   "http://dhimbiil.online",
//   "https://www.dhimbiil.online",
//   "http://www.dhimbiil.online",
//   "http://localhost:5173",
//   "http://31.97.177.139" // if you actually open the site by IP in your browser
// ]);
// app.use(
//   cors({
//     origin: (origin, cb) => {
//       // allow non-browser requests (like curl/postman with no Origin)
//       if (!origin) return cb(null, true);
//       if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
//       return cb(new Error(`Not allowed by CORS: ${origin}`));
//     },
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"]
//   })
// );
// // (optional) explicitly handle OPTIONS for legacy proxies
// app.options("*", cors());
// app.use(express.json());
// app.get("/", (_req: Request, res: Response) => {
//   res.send("API is running ✅");
// });
// app.use("/api/users", userRoutes);
// app.use("/api/voters", voterRoutes);
// app.use("/api/otp/email", emailOtpRoutes);
// app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
//   console.error("Unexpected error:", err);
//   res.status(500).json({ message: "Internal Server Error" });
// });
// const PORT = Number(process.env.PORT) || 4000;
// app.listen(PORT, "0.0.0.0", () => {
//   console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
// });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const userRoute_1 = __importDefault(require("./Routes/userRoute"));
const voter_routes_1 = __importDefault(require("./Routes/voter.routes"));
const emailOtp_routes_1 = __importDefault(require("./Routes/emailOtp.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
/** Allowed frontends (no spaces, exact origins) */
const ALLOWED_ORIGINS = new Set([
    "https://dhimbiil.online",
    "http://dhimbiil.online",
    "https://www.dhimbiil.online",
    "http://www.dhimbiil.online",
    "http://localhost:5173",
    "http://31.97.177.139" // only if you open the site by IP in a browser
]);
/** Reusable CORS options — use the SAME object for app.use and app.options */
const corsOptions = {
    origin: (origin, cb) => {
        // Allow non-browser tools (no Origin header): curl, Postman, server-to-server
        if (!origin)
            return cb(null, true);
        if (ALLOWED_ORIGINS.has(origin))
            return cb(null, true);
        // IMPORTANT: do NOT throw; just disallow CORS for that origin
        return cb(null, false);
    },
    // If you don't use cookies, you can set this to false. Keeping true is OK too.
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    // Optional: cache preflight for 10 minutes
    maxAge: 600,
};
// CORS MUST be before routes and before any auth middleware
app.use((0, cors_1.default)(corsOptions));
// Make sure preflight uses the SAME options
app.options("*", (0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.get("/", (_req, res) => {
    res.send("API is running ✅");
});
app.use("/api/users", userRoute_1.default);
app.use("/api/voters", voter_routes_1.default);
app.use("/api/otp/email", emailOtp_routes_1.default);
// Optional: small logger to debug CORS in dev
if (process.env.NODE_ENV !== "production") {
    app.use((req, _res, next) => {
        if (req.method === "OPTIONS") {
            console.log("🟡 CORS preflight from:", req.headers.origin);
        }
        next();
    });
}
app.use((err, _req, res, _next) => {
    console.error("Unexpected error:", err);
    res.status(500).json({ message: "Internal Server Error" });
});
const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
