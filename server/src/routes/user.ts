import { Router, Request, Response } from "express";
import { prisma } from "../prisma.js";

const router = Router();

// GET /api/user/preferences - Fetch user preferences (or guest default)
router.get("/preferences", async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;

    let preferences = null;
    if (userId && typeof userId === "string" && userId !== "anonymous-user") {
      preferences = await prisma.userPreferences.findUnique({
        where: { userId },
      });
    }

    if (!preferences) {
      preferences = await prisma.userPreferences.findFirst({
        where: { userId: null },
      });
    }

    if (!preferences) {
      preferences = {
        id: "default",
        userId: null,
        defaultVoice: process.env.DEFAULT_VOICE || "pt-BR-FranciscaNeural",
        language: process.env.DEFAULT_LANGUAGE || "pt-BR",
        playbackSpeed: 1.0,
        theme: "dark",
        updatedAt: new Date(),
      };
    }

    res.json(preferences);
  } catch (err) {
    console.error("Error fetching preferences:", err);
    res.status(500).json({ error: "Erro ao obter preferências." });
  }
});

// PUT /api/user/preferences - Update user preferences
router.put("/preferences", async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, defaultVoice, language, playbackSpeed, theme } = req.body;

    let validUserId: string | null = null;
    if (userId && typeof userId === "string" && userId !== "anonymous-user") {
      const userExists = await prisma.user.findUnique({ where: { id: userId } });
      if (userExists) {
        validUserId = userExists.id;
      }
    }

    // Find existing preferences record
    const existing = await prisma.userPreferences.findFirst({
      where: { userId: validUserId },
    });

    let updated;
    if (existing) {
      updated = await prisma.userPreferences.update({
        where: { id: existing.id },
        data: {
          defaultVoice: defaultVoice || undefined,
          language: language || undefined,
          playbackSpeed: typeof playbackSpeed === "number" ? playbackSpeed : undefined,
          theme: theme || undefined,
        },
      });
    } else {
      updated = await prisma.userPreferences.create({
        data: {
          userId: validUserId,
          defaultVoice: defaultVoice || process.env.DEFAULT_VOICE || "pt-BR-FranciscaNeural",
          language: language || process.env.DEFAULT_LANGUAGE || "pt-BR",
          playbackSpeed: typeof playbackSpeed === "number" ? playbackSpeed : 1.0,
          theme: theme || "dark",
        },
      });
    }

    res.json(updated);
  } catch (err) {
    console.error("Error updating preferences:", err);
    res.status(500).json({ error: "Erro ao atualizar preferências." });
  }
});

// POST /api/user/progress - Save audio playback progress position
router.post("/progress", async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, audioId, currentTime } = req.body;

    if (!audioId || typeof currentTime !== "number") {
      res.status(400).json({ error: "audioId e currentTime são obrigatórios." });
      return;
    }

    let validUserId: string | null = null;
    if (userId && typeof userId === "string" && userId !== "anonymous-user") {
      const userExists = await prisma.user.findUnique({ where: { id: userId } });
      if (userExists) {
        validUserId = userExists.id;
      }
    }

    // Upsert or update progress
    const existing = await prisma.playbackProgress.findFirst({
      where: {
        userId: validUserId,
        audioId,
      },
    });

    let progress;
    if (existing) {
      progress = await prisma.playbackProgress.update({
        where: { id: existing.id },
        data: { currentTime },
      });
    } else {
      progress = await prisma.playbackProgress.create({
        data: {
          userId: validUserId,
          audioId,
          currentTime,
        },
      });
    }

    res.json(progress);
  } catch (err) {
    console.error("Error saving progress:", err);
    res.status(500).json({ error: "Erro ao salvar posição de reprodução." });
  }
});

// GET /api/user/progress/:audioId - Get playback progress position
router.get("/progress/:audioId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { audioId } = req.params;
    const { userId } = req.query;

    let validUserId: string | null = null;
    if (userId && typeof userId === "string" && userId !== "anonymous-user") {
      validUserId = userId;
    }

    const progress = await prisma.playbackProgress.findFirst({
      where: {
        userId: validUserId,
        audioId,
      },
    });

    res.json(progress || { currentTime: 0 });
  } catch (err) {
    console.error("Error fetching progress:", err);
    res.status(500).json({ error: "Erro ao consultar progresso." });
  }
});

export default router;
