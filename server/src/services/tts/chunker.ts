/**
 * Chunker for large texts.
 * Splits text into natural reading chunks without cutting words or sentences.
 */
export function chunkText(text: string, maxChunkLength = 1500): string[] {
  const normalized = text.trim();
  if (!normalized) return [];
  if (normalized.length <= maxChunkLength) return [normalized];

  const chunks: string[] = [];
  // Split on double line breaks (paragraphs) first
  const paragraphs = normalized.split(/\n\s*\n/);
  let currentChunk = "";

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    // If paragraph itself fits in current chunk
    if ((currentChunk + "\n\n" + trimmedPara).trim().length <= maxChunkLength) {
      currentChunk = currentChunk ? currentChunk + "\n\n" + trimmedPara : trimmedPara;
    } else {
      // If current chunk has content, push it first
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = "";
      }

      // If single paragraph exceeds maxChunkLength, split by sentences
      if (trimmedPara.length > maxChunkLength) {
        const sentenceRegex = /[^.!?]+[.!?]+|\s*[^.!?]+$/g;
        const sentences = trimmedPara.match(sentenceRegex) || [trimmedPara];

        for (const sentence of sentences) {
          const trimmedSentence = sentence.trim();
          if (!trimmedSentence) continue;

          if ((currentChunk + " " + trimmedSentence).trim().length <= maxChunkLength) {
            currentChunk = currentChunk ? currentChunk + " " + trimmedSentence : trimmedSentence;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk);
              currentChunk = "";
            }

            // Fallback for an exceptionally long sentence without punctuation
            if (trimmedSentence.length > maxChunkLength) {
              const words = trimmedSentence.split(/\s+/);
              for (const word of words) {
                if ((currentChunk + " " + word).trim().length <= maxChunkLength) {
                  currentChunk = currentChunk ? currentChunk + " " + word : word;
                } else {
                  if (currentChunk) chunks.push(currentChunk);
                  currentChunk = word;
                }
              }
            } else {
              currentChunk = trimmedSentence;
            }
          }
        }
      } else {
        currentChunk = trimmedPara;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Estimates reading duration in seconds.
 * Average reading speed: ~140-160 words per minute (2.5 words/sec).
 */
export function estimateDuration(text: string, rate = 1.0): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  const wordsPerSecond = 2.5 * rate;
  return Math.round(words / wordsPerSecond);
}
