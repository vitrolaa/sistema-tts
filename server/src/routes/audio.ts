import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import { prisma } from "../prisma.js";
import { ttsManager } from "../services/tts/index.js";

const router = Router();

const getStorageDir = () => {
  const customPath = process.env.AUDIO_STORAGE_PATH || "./uploads/audio";
  const resolved = path.resolve(process.cwd(), customPath);
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
  }
  return resolved;
};

// GET /api/tts/voices - List all available synthesis voices
router.get("/tts/voices", async (_req: Request, res: Response): Promise<void> => {
  try {
    const voices = await ttsManager.getAllVoices();
    res.json(voices);
  } catch (err) {
    console.error("Error fetching voices:", err);
    res.status(500).json({ error: "Erro ao obter lista de vozes." });
  }
});

// POST /api/texts/:id/audio - Request audio generation for a text
router.post("/texts/:id/audio", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: textId } = req.params;
    const { voice, language, rate, forceRegenerate } = req.body;

    const text = await prisma.text.findUnique({
      where: { id: textId },
    });

    if (!text) {
      res.status(404).json({ error: "Texto não encontrado para geração de áudio." });
      return;
    }

    const chosenVoice = voice || process.env.DEFAULT_VOICE || "pt-BR-FranciscaNeural";
    const chosenLang = language || process.env.DEFAULT_LANGUAGE || "pt-BR";
    const chosenRate = typeof rate === "number" ? rate : 1.0;

    // Check if matching completed audio already exists to avoid redundant generation
    if (!forceRegenerate) {
      const existingAudio = await prisma.audio.findFirst({
        where: {
          textId,
          voice: chosenVoice,
          language: chosenLang,
          status: "COMPLETED",
        },
        orderBy: { createdAt: "desc" },
      });

      if (existingAudio && existingAudio.filePath && fs.existsSync(existingAudio.filePath)) {
        res.json({
          audio: existingAudio,
          message: "Áudio existente reutilizado com sucesso.",
          reused: true,
        });
        return;
      }
    }

    // Create pending audio record in DB
    const audioRecord = await prisma.audio.create({
      data: {
        textId,
        status: "PROCESSING",
        voice: chosenVoice,
        language: chosenLang,
        format: "mp3",
      },
    });

    res.status(202).json({
      audio: audioRecord,
      message: "Geração de áudio iniciada com sucesso.",
    });

    // Run synthesis asynchronously in background
    (async () => {
      try {
        const outputDir = getStorageDir();
        const result = await ttsManager.generate(audioRecord.id, text.content, outputDir, {
          voice: chosenVoice,
          language: chosenLang,
          rate: chosenRate,
        });

        await prisma.audio.update({
          where: { id: audioRecord.id },
          data: {
            status: "COMPLETED",
            filePath: result.filePath,
            fileSize: result.fileSize,
            duration: result.duration,
          },
        });
      } catch (genError: any) {
        console.error("Error synthesizing audio:", genError);
        await prisma.audio.update({
          where: { id: audioRecord.id },
          data: {
            status: "FAILED",
          },
        });
        ttsManager.setProgress(audioRecord.id, 0, "Falha na geração do áudio", String(genError?.message || genError));
      }
    })();
  } catch (err) {
    console.error("Error creating audio generation request:", err);
    res.status(500).json({ error: "Erro ao solicitar a síntese de áudio." });
  }
});

// GET /api/audio/:id/status - Check progress/status of generation
router.get("/audio/:id/status", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const audio = await prisma.audio.findUnique({
      where: { id },
    });

    if (!audio) {
      res.status(404).json({ error: "Registro de áudio não encontrado." });
      return;
    }

    const liveProgress = ttsManager.getProgress(id);

    res.json({
      id: audio.id,
      status: audio.status,
      duration: audio.duration,
      fileSize: audio.fileSize,
      progressPercent: audio.status === "COMPLETED" ? 100 : liveProgress.percent,
      statusMessage: audio.status === "COMPLETED" ? "Concluído" : liveProgress.message,
      error: liveProgress.error,
    });
  } catch (err) {
    console.error("Error fetching audio status:", err);
    res.status(500).json({ error: "Erro ao consultar o status do áudio." });
  }
});

// GET /api/audio/:id/stream - HTTP Range (206) Audio Streamer
router.get("/audio/:id/stream", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const audio = await prisma.audio.findUnique({
      where: { id },
    });

    if (!audio || !audio.filePath || !fs.existsSync(audio.filePath)) {
      res.status(404).json({ error: "Arquivo de áudio não encontrado ou ainda em processamento." });
      return;
    }

    const filePath = audio.filePath;
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Parse Range header: "bytes=start-end"
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        res.status(416).set({ "Content-Range": `bytes */${fileSize}` }).end();
        return;
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      });

      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Accept-Ranges": "bytes",
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      });

      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error("Error streaming audio:", err);
    res.status(500).json({ error: "Erro ao transmitir áudio." });
  }
});

// GET /api/audio/:id/download - Download audio file
router.get("/audio/:id/download", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const audio = await prisma.audio.findUnique({
      where: { id },
      include: { text: true },
    });

    if (!audio || !audio.filePath || !fs.existsSync(audio.filePath)) {
      res.status(404).json({ error: "Arquivo de áudio não encontrado para download." });
      return;
    }

    const cleanTitle = (audio.text?.title || "audio")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    const downloadFileName = `VozLivre_${cleanTitle}.mp3`;

    res.download(audio.filePath, downloadFileName);
  } catch (err) {
    console.error("Error downloading audio:", err);
    res.status(500).json({ error: "Erro ao baixar arquivo de áudio." });
  }
});

export default router;
