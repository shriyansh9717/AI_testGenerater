import crypto from 'crypto';

/** Normalises OCR/PDF output: collapses broken line breaks, hyphenation and noise. */
export function cleanText(raw = '') {
  return String(raw)
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/([a-z])-\n([a-z])/g, '$1$2')       // de-hyphenate across line breaks
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s*page\s+\d+\s*$/gim, '')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

export function normalizeForCompare(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function fingerprint(question) {
  return crypto.createHash('sha1').update(normalizeForCompare(question)).digest('hex');
}

/**
 * Splits long source text into paragraph-aligned chunks and selects the ones most
 * relevant to the requested topic, so the model gets focused context instead of a
 * truncated dump.
 */
export function selectRelevantChunks(text, { topic = '', maxChars = 12000, chunkSize = 1800 } = {}) {
  const clean = cleanText(text);
  if (clean.length <= maxChars) return clean;

  const paragraphs = clean.split(/\n{2,}/);
  const chunks = [];
  let current = '';
  for (const paragraph of paragraphs) {
    if ((current + '\n\n' + paragraph).length > chunkSize && current) {
      chunks.push(current.trim());
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  const keywords = normalizeForCompare(topic).split(' ').filter((w) => w.length > 3);
  const scored = chunks.map((chunk, index) => {
    const haystack = normalizeForCompare(chunk);
    const score = keywords.reduce((acc, word) => acc + (haystack.includes(word) ? 1 : 0), 0);
    return { chunk, index, score };
  });

  scored.sort((a, b) => (b.score - a.score) || (a.index - b.index));

  const picked = [];
  let used = 0;
  for (const item of scored) {
    if (used + item.chunk.length > maxChars) continue;
    picked.push(item);
    used += item.chunk.length;
    if (used >= maxChars * 0.95) break;
  }
  picked.sort((a, b) => a.index - b.index);
  return picked.map((p) => p.chunk).join('\n\n');
}

export function shuffle(items, seedRandom = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(seedRandom() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
