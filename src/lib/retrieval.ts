import { prisma } from "@/lib/prisma";
import { sanitizeExtractedText } from "@/lib/text-normalization";

export type RetrievedChunk = {
  chunkId: string;
  docName: string;
  quotedSnippet: string;
  fullContent: string;
  similarity: number;
};

type RetrievalRow = {
  chunkId: string;
  docName: string;
  content: string;
  distance: number;
};

const DEFAULT_TOP_K = 10;
const DEFAULT_SNIPPET_CHARS = 700;

export const RETRIEVAL_SQL = `
SELECT
  ec."id" AS "chunkId",
  ed."name" AS "docName",
  ec."content" AS "content",
  (ec."embedding" <=> $1::vector) AS "distance"
FROM "EvidenceChunk" ec
JOIN "EvidenceDocument" ed ON ed."id" = ec."documentId"
WHERE ed."workspaceId" = $2
  AND ed."archivedAt" IS NULL
  AND ed."status" = 'READY'
  AND ec."embedding" IS NOT NULL
ORDER BY distance ASC, ec."id" ASC
LIMIT $3
`;

export function embeddingToVectorLiteral(embedding: number[]) {
  return `[${embedding.join(",")}]`;
}

function normalizeWhitespace(value: string) {
  return sanitizeExtractedText(value).replace(/\s+/g, " ").trim();
}

function getQuestionAnchorTokens(questionText: string) {
  const tokens = new Set<string>();

  for (const token of questionText.match(/\b[a-zA-Z][a-zA-Z0-9-]{3,}\b/g) ?? []) {
    tokens.add(token.toLowerCase());
  }

  return Array.from(tokens).slice(0, 20);
}

function findBestAnchorIndex(text: string, anchorTokens: string[]) {
  const normalized = normalizeWhitespace(text).toLowerCase();
  if (!normalized || anchorTokens.length === 0) {
    return -1;
  }

  let bestIndex = -1;
  let bestScore = 0;

  for (const token of anchorTokens) {
    const index = normalized.indexOf(token);
    if (index >= 0) {
      const score = token.length;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
  }

  return bestIndex;
}

function selectSnippet(params: { content: string; questionText: string; snippetChars?: number }) {
  const normalized = normalizeWhitespace(params.content);
  if (normalized.length <= (params.snippetChars ?? DEFAULT_SNIPPET_CHARS)) {
    return normalized;
  }

  const anchorIndex = findBestAnchorIndex(normalized, getQuestionAnchorTokens(params.questionText));
  if (anchorIndex < 0) {
    return normalized.slice(0, params.snippetChars ?? DEFAULT_SNIPPET_CHARS).trim();
  }

  const snippetChars = params.snippetChars ?? DEFAULT_SNIPPET_CHARS;
  const start = Math.max(0, anchorIndex - Math.floor(snippetChars * 0.35));
  const end = Math.min(normalized.length, start + snippetChars);
  return normalized.slice(start, end).trim();
}

export async function retrieveTopChunks(params: {
  workspaceId: string;
  embedding: number[];
  questionText: string;
  topK?: number;
  snippetChars?: number;
}) {
  const rows = await prisma.$queryRawUnsafe<RetrievalRow[]>(
    RETRIEVAL_SQL,
    embeddingToVectorLiteral(params.embedding),
    params.workspaceId,
    params.topK ?? DEFAULT_TOP_K
  );

  return rows.map<RetrievedChunk>((row) => ({
    chunkId: row.chunkId,
    docName: row.docName,
    fullContent: row.content,
    quotedSnippet: selectSnippet({
      content: row.content,
      questionText: params.questionText,
      snippetChars: params.snippetChars
    }),
    similarity: 1 - Number(row.distance)
  }));
}
