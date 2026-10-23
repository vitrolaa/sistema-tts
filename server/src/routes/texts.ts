import { Router, Request, Response } from "express";
import { prisma } from "../prisma.js";
import fs from "fs";

const router = Router();

// POST /api/texts - Create text
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, content, favorite, userId } = req.body;

    if (!content || typeof content !== "string" || !content.trim()) {
      res.status(400).json({ error: "O conteúdo do texto é obrigatório." });
      return;
    }

    const textTitle = title?.trim() || `Texto ${new Date().toLocaleDateString("pt-BR")}`;

    const newText = await prisma.text.create({
      data: {
        title: textTitle,
        content: content.trim(),
        favorite: !!favorite,
        userId: userId || null,
      },
      include: {
        audios: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    res.status(201).json(newText);
  } catch (err) {
    console.error("Error creating text:", err);
    res.status(500).json({ error: "Erro interno ao salvar o texto." });
  }
});

// GET /api/texts - List all texts
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, favorite, limit, offset } = req.query;

    const whereClause: any = {};

    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { title: { contains: q } },
        { content: { contains: q } },
      ];
    }

    if (favorite === "true") {
      whereClause.favorite = true;
    }

    const texts = await prisma.text.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
      take: limit ? parseInt(limit as string, 10) : 50,
      skip: offset ? parseInt(offset as string, 10) : 0,
      include: {
        audios: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            duration: true,
            voice: true,
            fileSize: true,
            createdAt: true,
          },
        },
      },
    });

    const totalCount = await prisma.text.count({ where: whereClause });

    res.json({
      texts,
      total: totalCount,
    });
  } catch (err) {
    console.error("Error listing texts:", err);
    res.status(500).json({ error: "Erro interno ao listar os textos." });
  }
});

// GET /api/texts/:id - Get text by ID
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const text = await prisma.text.findUnique({
      where: { id },
      include: {
        audios: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!text) {
      res.status(404).json({ error: "Texto não encontrado." });
      return;
    }

    res.json(text);
  } catch (err) {
    console.error("Error fetching text:", err);
    res.status(500).json({ error: "Erro ao buscar o texto." });
  }
});

// PUT /api/texts/:id - Update text
router.put("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, content, favorite } = req.body;

    const dataToUpdate: any = {};
    if (title !== undefined) dataToUpdate.title = title.trim();
    if (content !== undefined) dataToUpdate.content = content.trim();
    if (favorite !== undefined) dataToUpdate.favorite = !!favorite;

    const updatedText = await prisma.text.update({
      where: { id },
      data: dataToUpdate,
      include: {
        audios: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    res.json(updatedText);
  } catch (err) {
    console.error("Error updating text:", err);
    res.status(500).json({ error: "Erro ao atualizar o texto." });
  }
});

// DELETE /api/texts/:id - Delete text and associated audio files
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const audios = await prisma.audio.findMany({
      where: { textId: id },
    });

    // Clean up physical audio files from disk
    for (const audio of audios) {
      if (audio.filePath && fs.existsSync(audio.filePath)) {
        try {
          fs.unlinkSync(audio.filePath);
        } catch (e) {
          console.warn("Failed to delete physical audio file:", e);
        }
      }
    }

    await prisma.text.delete({
      where: { id },
    });

    res.json({ message: "Texto excluído com sucesso." });
  } catch (err) {
    console.error("Error deleting text:", err);
    res.status(500).json({ error: "Erro ao excluir o texto." });
  }
});

export default router;
