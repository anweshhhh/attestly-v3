import { findApprovedAnswerReuse, type ReusedApprovedAnswer } from "@/lib/approved-answer-reuse";
import { createEmbedding, generateGroundedAnswer } from "@/lib/openai";
import { retrieveTopChunks } from "@/lib/retrieval";
import { sanitizeExtractedText } from "@/lib/text-normalization";

export type Citation = {
  docName: string;
  chunkId: string;
  quotedSnippet: string;
};

export type EvidenceAnswer = {
  answer: string;
  citations: Citation[];
  confidence: "low" | "med" | "high";
  needsReview: boolean;
  reusedFromApprovedAnswerId?: string;
  reusedFromApprovedMatchType?: "EXACT" | "NEAR_EXACT" | "SEMANTIC";
  notFoundReason?: string | null;
};

export const NOT_FOUND_TEXT = "Not enough evidence was found to support a grounded answer.";
export const PARTIAL_PREFIX = "Partial answer:";

function asCitations(reused: ReusedApprovedAnswer): Citation[] {
  return reused.citations.map((citation) => ({
    docName: citation.docName,
    chunkId: citation.chunkId,
    quotedSnippet: citation.quotedSnippet
  }));
}

function scoreLexicalOverlap(questionText: string, text: string) {
  const tokens = questionText.toLowerCase().match(/[a-z0-9-]{4,}/g) ?? [];
  const haystack = sanitizeExtractedText(text).toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += 1;
    }
  }
  return score;
}

export async function answerQuestionFromEvidence(params: {
  workspaceId: string;
  questionText: string;
}): Promise<EvidenceAnswer> {
  const reused = await findApprovedAnswerReuse({
    workspaceId: params.workspaceId,
    questionText: params.questionText
  });

  if (reused) {
    return {
      answer: reused.answerText,
      citations: asCitations(reused),
      confidence: reused.matchType === "EXACT" ? "high" : "med",
      needsReview: reused.matchType !== "EXACT",
      reusedFromApprovedAnswerId: reused.approvedAnswerId,
      reusedFromApprovedMatchType: reused.matchType
    };
  }

  const embedding = await createEmbedding(params.questionText);
  const retrieved = await retrieveTopChunks({
    workspaceId: params.workspaceId,
    embedding,
    questionText: params.questionText,
    topK: 12
  });

  const reranked = [...retrieved]
    .map((chunk) => ({
      chunk,
      lexicalScore: scoreLexicalOverlap(params.questionText, chunk.fullContent)
    }))
    .sort((left, right) => {
      const leftScore = left.chunk.similarity * 0.7 + left.lexicalScore * 0.3;
      const rightScore = right.chunk.similarity * 0.7 + right.lexicalScore * 0.3;
      return rightScore - leftScore;
    })
    .slice(0, 5)
    .map((entry) => entry.chunk);

  if (reranked.length === 0 || reranked.every((chunk) => chunk.similarity < 0.2)) {
    return {
      answer: NOT_FOUND_TEXT,
      citations: [],
      confidence: "low",
      needsReview: true,
      notFoundReason: "NO_RELEVANT_EVIDENCE"
    };
  }

  const grounded = await generateGroundedAnswer({
    question: params.questionText,
    snippets: reranked.map((chunk) => ({
      chunkId: chunk.chunkId,
      docName: chunk.docName,
      quotedSnippet: chunk.quotedSnippet
    }))
  });

  return {
    answer:
      grounded.outcome === "NOT_FOUND"
        ? NOT_FOUND_TEXT
        : grounded.outcome === "PARTIAL"
          ? grounded.answer.startsWith(PARTIAL_PREFIX)
            ? grounded.answer
            : `${PARTIAL_PREFIX} ${grounded.answer}`
          : grounded.answer,
    citations: grounded.citations.map((citation) => {
      const matched = reranked.find((chunk) => chunk.chunkId === citation.chunkId);
      return {
        chunkId: citation.chunkId,
        docName: matched?.docName ?? "Evidence",
        quotedSnippet: citation.quotedSnippet || matched?.quotedSnippet || ""
      };
    }),
    confidence: grounded.confidence,
    needsReview: grounded.needsReview,
    notFoundReason: grounded.notFoundReason
  };
}
