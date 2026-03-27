import { getOpenAIApiKey, getOpenAIChatModel } from "@/lib/env";

export const OPENAI_EMBEDDINGS_MODEL = "text-embedding-3-small";

export type GroundedAnswerModelOutput = {
  outcome: "FOUND" | "PARTIAL" | "NOT_FOUND";
  answer: string;
  citations: Array<{
    chunkId: string;
    quotedSnippet: string;
  }>;
  confidence: "low" | "med" | "high";
  needsReview: boolean;
  notFoundReason: string | null;
};

type RetrievedSnippet = {
  chunkId: string;
  docName: string;
  quotedSnippet: string;
};

const OPENAI_API_BASE = "https://api.openai.com/v1";

async function requestOpenAI(path: string, payload: Record<string, unknown>) {
  const response = await fetch(`${OPENAI_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAIApiKey()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function createEmbedding(input: string): Promise<number[]> {
  const payload = (await requestOpenAI("/embeddings", {
    model: OPENAI_EMBEDDINGS_MODEL,
    input
  })) as {
    data?: Array<{ embedding?: number[] }>;
  };

  const embedding = payload.data?.[0]?.embedding;
  if (!embedding || embedding.length !== 1536) {
    throw new Error("Embedding response is missing or malformed.");
  }

  return embedding;
}

function toSnippetText(snippets: RetrievedSnippet[]) {
  return snippets
    .map(
      (snippet, index) =>
        `Snippet ${index + 1}\nchunkId: ${snippet.chunkId}\ndocName: ${snippet.docName}\ntext: ${snippet.quotedSnippet}`
    )
    .join("\n\n");
}

function extractMessageContent(response: Record<string, unknown>) {
  const choices = Array.isArray(response.choices) ? response.choices : [];
  const first = choices[0] as { message?: { content?: string } } | undefined;
  return typeof first?.message?.content === "string" ? first.message.content : "";
}

function parseGroundedAnswerOutput(raw: string, allowedChunkIds: Set<string>): GroundedAnswerModelOutput {
  const parsed = JSON.parse(raw) as GroundedAnswerModelOutput;

  const outcome = parsed.outcome === "FOUND" || parsed.outcome === "PARTIAL" || parsed.outcome === "NOT_FOUND"
    ? parsed.outcome
    : "NOT_FOUND";

  const citations = Array.isArray(parsed.citations)
    ? parsed.citations
        .filter((citation): citation is { chunkId: string; quotedSnippet: string } => {
          return (
            typeof citation?.chunkId === "string" &&
            typeof citation?.quotedSnippet === "string" &&
            allowedChunkIds.has(citation.chunkId.trim())
          );
        })
        .map((citation) => ({
          chunkId: citation.chunkId.trim(),
          quotedSnippet: citation.quotedSnippet.trim()
        }))
    : [];

  if (outcome === "FOUND" && citations.length === 0) {
    return {
      outcome: "NOT_FOUND",
      answer: "Not enough evidence was found to support a grounded answer.",
      citations: [],
      confidence: "low",
      needsReview: true,
      notFoundReason: "NO_CITATIONS_RETURNED"
    };
  }

  return {
    outcome,
    answer: typeof parsed.answer === "string" && parsed.answer.trim()
      ? parsed.answer.trim()
      : "Not enough evidence was found to support a grounded answer.",
    citations,
    confidence: parsed.confidence === "high" || parsed.confidence === "med" ? parsed.confidence : "low",
    needsReview: parsed.needsReview !== false,
    notFoundReason: typeof parsed.notFoundReason === "string" ? parsed.notFoundReason : null
  };
}

export async function generateGroundedAnswer(params: {
  question: string;
  snippets: RetrievedSnippet[];
}): Promise<GroundedAnswerModelOutput> {
  const allowedChunkIds = new Set(params.snippets.map((snippet) => snippet.chunkId));
  const system = [
    "You are drafting evidence-grounded answers for security questionnaires.",
    "Return JSON only.",
    "Never invent support beyond the supplied snippets.",
    "Use outcome FOUND only when citations directly support the answer.",
    "Use PARTIAL when some support exists but material details are missing.",
    "Use NOT_FOUND when evidence is absent or too weak.",
    "For FOUND and PARTIAL, cite only chunkIds from the supplied snippets."
  ].join(" ");

  const user = [
    `Question:\n${params.question}`,
    "",
    "Evidence snippets:",
    toSnippetText(params.snippets),
    "",
    "Return JSON with keys:",
    '{ "outcome": "FOUND|PARTIAL|NOT_FOUND", "answer": string, "citations": [{ "chunkId": string, "quotedSnippet": string }], "confidence": "low|med|high", "needsReview": boolean, "notFoundReason": string | null }'
  ].join("\n");

  const response = (await requestOpenAI("/chat/completions", {
    model: getOpenAIChatModel(),
    temperature: 0,
    response_format: {
      type: "json_object"
    },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  })) as Record<string, unknown>;

  return parseGroundedAnswerOutput(extractMessageContent(response), allowedChunkIds);
}
