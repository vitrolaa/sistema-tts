import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

import textsRouter from "./routes/texts.js";
import audioRouter from "./routes/audio.js";
import userRouter from "./routes/user.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Ensure audio storage directory exists
const audioStoragePath = path.resolve(process.cwd(), process.env.AUDIO_STORAGE_PATH || "./uploads/audio");
if (!fs.existsSync(audioStoragePath)) {
  fs.mkdirSync(audioStoragePath, { recursive: true });
}

// Middleware
app.use(
  cors({
    origin: "*", // Allow mobile PWA, localhost, and local network IPs
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Range"],
    exposedHeaders: ["Content-Range", "Accept-Ranges", "Content-Length"],
  })
);

app.use(express.json({ limit: "15mb" })); // Support large texts and chapters
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Healthcheck
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "VozLivre Backend API",
    timestamp: new Date().toISOString(),
    storageDir: audioStoragePath,
  });
});

// API Routes
app.use("/api/texts", textsRouter);
app.use("/api", audioRouter);
app.use("/api/user", userRouter);

// Serve frontend client build if present, or redirect to Vite dev server
const clientDistPath = path.resolve(process.cwd(), "../client/dist");
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.redirect("http://localhost:5173");
  });
}

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Ocorreu um erro interno no servidor.",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

app.listen(port, () => {
  console.log(`===============================================`);
  console.log(`🎙️ VozLivre Server listening on http://localhost:${port}`);
  console.log(`📁 Audio Storage Directory: ${audioStoragePath}`);
  console.log(`🚀 Default Voice: ${process.env.DEFAULT_VOICE || "pt-BR-FranciscaNeural"}`);
  console.log(`===============================================`);
});
