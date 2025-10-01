import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import userRoutes from "./Routes/userRoute";
import voterRoutes from "./Routes/voter.routes";

dotenv.config();

const app = express();

/** Allowed frontends (no spaces, exact origins) */
const ALLOWED_ORIGINS = new Set<string>([
  "https://dhimbiil.online",
  "http://dhimbiil.online",
  "https://www.dhimbiil.online",
  "http://www.dhimbiil.online",
  "http://localhost:5173",
  "http://31.97.177.139" // if you actually open the site by IP in your browser
]);

app.use(
  cors({
    origin: (origin, cb) => {
      // allow non-browser requests (like curl/postman with no Origin)
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
      return cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// (optional) explicitly handle OPTIONS for legacy proxies
app.options("*", cors());

app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.send("API is running ✅");
});

app.use("/api/users", userRoutes);
app.use("/api/voters", voterRoutes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unexpected error:", err);
  res.status(500).json({ message: "Internal Server Error" });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
