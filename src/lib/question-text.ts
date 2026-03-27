import { sha256 } from "@/lib/fingerprint";
import { sanitizeExtractedText } from "@/lib/text-normalization";

export function normalizeQuestionText(value: string) {
  return sanitizeExtractedText(value)
    .normalize("NFKC")
    .replace(/[‐‑‒–—―−]/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9./\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildQuestionTextMetadata(value: string) {
  const normalizedQuestionText = normalizeQuestionText(value);
  return {
    normalizedQuestionText,
    questionTextHash: sha256(normalizedQuestionText)
  };
}

function toTokenSet(value: string) {
  return new Set(
    normalizeQuestionText(value)
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= 4)
  );
}

export function questionTextNearExactSimilarity(left: string, right: string) {
  const leftTokens = toTokenSet(left);
  const rightTokens = toTokenSet(right);

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }

  const denominator = Math.max(leftTokens.size, rightTokens.size);
  return overlap / denominator;
}
