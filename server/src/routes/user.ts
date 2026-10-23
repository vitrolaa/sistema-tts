import { Router, Request, Response } from "express";
import { prisma } from "../prisma.js";

const router = Router();

// GET /api/user/preferences - Fetch user preferences (or guest default)
router.get("/preferences", async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;

    let preferences = null;
    if (userId && typeof userId === "string") {
      preferences = await prisma.userPreferences.findUnique({
        where: { userId },
      });
    }

    if (!preferences) {
      preferences = {
        id: "default",
        userId: userId ? String(userId) : null,
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

    const targetUserId = userId || "anonymous-user";

    // Upsert preference
    const updated = await prisma.userPreferences.upsert({
      where: { userId: targetUserId },
      update: {
        defaultVoice: defaultVoice || undefined,
        language: language || undefined,
        playbackSpeed: typeof playbackSpeed === "number" ? playbackSpeed : undefined,
        theme: theme || undefined,
      },
      create: {
        userId: targetUserId,
        defaultVoice: defaultVoice || "pt-BR-FranciscaNeural",
        language: language || "pt-BR",
        playbackSpeed: typeof playbackSpeed === "number" ? playbackSpeed : 1.0,
        theme: theme || "dark",
      },
    });

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

    const targetUserId = userId || "anonymous-user";

    const progress = await prisma.playbackProgress.upsert({
      where: {
        userId_audioId: {
          userId: targetUserId,
          audioId,
        },
      },
      update: {
        currentTime,
      },
      create: {
        userId: targetUserId,
        audioId,
        currentTime,
      },
    });

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
    const targetUserId = (userId as string) || "anonymous-user";

    const progress = await prisma.playbackProgress.findUnique({
      where: {
        userId_audioId: {
          userId: targetUserId,
          audioId,
        },
      },
    });

    res.json(progress || { currentTime: 0 });
  } catch (err) {
    console.error("Error fetching progress:", err);
    res.status(500).json({ error: "Erro ao consultar progresso." });
  }
});

export default router;
