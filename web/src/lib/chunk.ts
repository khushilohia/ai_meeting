const MAX_CHUNK = 1200; // chars — roughly 300 tokens, keeps retrieval granular

/** Paragraph-aware chunking: pack paragraphs up to MAX_CHUNK; hard-split oversized ones. */
export function chunkText(text: string): string[] {
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const p of paras) {
    if (p.length > MAX_CHUNK) {
      if (current) chunks.push(current), (current = "");
      for (let i = 0; i < p.length; i += MAX_CHUNK) chunks.push(p.slice(i, i + MAX_CHUNK));
      continue;
    }
    if (current.length + p.length + 2 > MAX_CHUNK) {
      chunks.push(current);
      current = p;
    } else {
      current = current ? current + "\n\n" + p : p;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
