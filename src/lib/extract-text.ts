import pdfParse from "pdf-parse";
import { AppError } from "@/lib/errors";
import { sanitizeExtractedText } from "@/lib/text-normalization";

const PLAIN_TEXT_MIME_TYPES = new Set(["text/plain", "text/markdown", "text/x-markdown"]);

function bufferToUtf8(bytes: Buffer) {
  return sanitizeExtractedText(bytes.toString("utf8")).trim();
}

export async function extractTextFromBytes(params: {
  bytes: Buffer;
  mimeType: string;
  fileName: string;
}) {
  const normalizedMimeType = params.mimeType.trim().toLowerCase();
  const normalizedFileName = params.fileName.trim().toLowerCase();

  if (normalizedMimeType === "application/pdf" || normalizedFileName.endsWith(".pdf")) {
    const parsed = await pdfParse(params.bytes);
    return sanitizeExtractedText(parsed.text ?? "").trim();
  }

  if (PLAIN_TEXT_MIME_TYPES.has(normalizedMimeType) || normalizedFileName.endsWith(".txt") || normalizedFileName.endsWith(".md")) {
    return bufferToUtf8(params.bytes);
  }

  throw new AppError("Supported evidence formats are PDF, TXT, and Markdown.", {
    code: "UNSUPPORTED_EVIDENCE_FILE_TYPE",
    status: 400
  });
}
