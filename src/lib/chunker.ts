import { sanitizeExtractedText } from "@/lib/text-normalization";

export const DEFAULT_MAX_CHARS = 1500;
export const DEFAULT_OVERLAP_CHARS = 200;
const MIN_CHUNK_FILL_RATIO = 0.6;
const MAX_BOUNDARY_LOOKAHEAD = 64;

export type Chunk = {
  chunkIndex: number;
  content: string;
};

function isBoundaryChar(value: string) {
  return /\s/.test(value);
}

function findChunkEnd(params: { text: string; start: number; maxChars: number }) {
  const tentativeEnd = Math.min(params.start + params.maxChars, params.text.length);
  if (tentativeEnd >= params.text.length) {
    return params.text.length;
  }

  const minEnd = Math.max(params.start + 1, params.start + Math.floor(params.maxChars * MIN_CHUNK_FILL_RATIO));
  for (let cursor = tentativeEnd; cursor > minEnd; cursor -= 1) {
    if (isBoundaryChar(params.text[cursor])) {
      return cursor;
    }
  }

  const maxForward = Math.min(params.text.length, tentativeEnd + MAX_BOUNDARY_LOOKAHEAD);
  for (let cursor = tentativeEnd + 1; cursor <= maxForward; cursor += 1) {
    if (isBoundaryChar(params.text[cursor])) {
      return cursor;
    }
  }

  return tentativeEnd;
}

function findNextChunkStart(params: { text: string; start: number; end: number; overlapChars: number }) {
  let nextStart = Math.max(0, params.end - params.overlapChars);
  if (nextStart > 0) {
    while (nextStart < params.end && !isBoundaryChar(params.text[nextStart - 1])) {
      nextStart += 1;
    }
  }
  return nextStart <= params.start ? Math.min(params.end, params.start + 1) : nextStart;
}

export function chunkText(text: string, options: { maxChars?: number; overlapChars?: number } = {}): Chunk[] {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
  const overlapChars = options.overlapChars ?? DEFAULT_OVERLAP_CHARS;
  const normalizedText = sanitizeExtractedText(text).replace(/\r\n/g, "\n").trim();

  if (!normalizedText) {
    return [];
  }

  const chunks: Chunk[] = [];
  let chunkIndex = 0;
  let start = 0;

  while (start < normalizedText.length) {
    let end = findChunkEnd({ text: normalizedText, start, maxChars });
    if (end <= start) {
      end = Math.min(start + maxChars, normalizedText.length);
    }

    const content = normalizedText.slice(start, end).trim();
    if (!content) {
      break;
    }

    chunks.push({ chunkIndex, content });
    chunkIndex += 1;

    if (end >= normalizedText.length) {
      break;
    }

    start = findNextChunkStart({ text: normalizedText, start, end, overlapChars });
  }

  return chunks;
}
