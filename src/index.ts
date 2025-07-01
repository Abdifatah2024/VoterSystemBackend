// import express, { Request, Response, NextFunction } from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import userRoutes from "./Routes/userRoute";
// import voterRoutes from "./Routes/voter.routes";

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
import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import userRoutes from "./Routes/userRoute";
import voterRoutes from "./Routes/voter.routes";

// Load environment variables from .env
dotenv.config();

// Create Express app
const app = express();

// Enable CORS (Cross-Origin Resource Sharing)
app.use(
  cors({
    origin: [
      "https://voter-system-fronend.vercel.app",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);

// Parse JSON bodies
app.use(express.json());

// Health check
app.get("/", (_req: Request, res: Response) => {
  res.send("API is running ✅");
});

// User routes
app.use("/api/users", userRoutes);

// Voter routes
app.use("/api/voters", voterRoutes);

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unexpected error:", err);
  res.status(500).json({ message: "Internal Server Error" });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
