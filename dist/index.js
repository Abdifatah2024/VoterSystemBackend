"use strict";
// import express, { Request, Response, NextFunction } from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import userRoutes from "./Routes/userRoute";
// import voterRoutes from "./Routes/voter.routes";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// // Load environment variables from .env
// dotenv.config();
// // Create Express app
// const app = express();
// // Enable CORS (Cross-Origin Resource Sharing)
// app.use(
//   cors({
//     origin: process.env.CLIENT_URL || "http://localhost:5173", // Frontend URL
//     credentials: true, // Enable cookies/auth headers if needed
//   })
// );
// // Parse JSON bodies
// app.use(express.json());
// // Health check
// app.get("/", (_req: Request, res: Response) => {
//   res.send("API is running ✅");
// });
// // User routes
// app.use("/api/users", userRoutes);
// // Voter routes
// app.use("/api/voters", voterRoutes);
// // Global error handler
// app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
//   console.error("Unexpected error:", err);
//   res.status(500).json({ message: "Internal Server Error" });
// });
// // Start server
// const PORT = process.env.PORT || 4000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on http://localhost:${PORT}`);
// });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const userRoute_1 = __importDefault(require("./Routes/userRoute"));
const voter_routes_1 = __importDefault(require("./Routes/voter.routes"));
// Load environment variables from .env
dotenv_1.default.config();
// Create Express app
const app = (0, express_1.default)();
// Enable CORS (Cross-Origin Resource Sharing)
app.use((0, cors_1.default)({
    origin: [
        "http://31.97.177.139",
        "https://voter-system-fronend.vercel.app",
        "http://localhost:5173",
    ],
    credentials: true,
}));
// Parse JSON bodies
app.use(express_1.default.json());
// Health check
app.get("/", (_req, res) => {
    res.send("API is running ✅");
});
// User routes
app.use("/api/users", userRoute_1.default);
// Voter routes
app.use("/api/voters", voter_routes_1.default);
// Global error handler
app.use((err, _req, res, _next) => {
    console.error("Unexpected error:", err);
    res.status(500).json({ message: "Internal Server Error" });
});
// Start server
const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
