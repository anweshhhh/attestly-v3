import { randomUUID } from "node:crypto";
import { DocumentStatus } from "@prisma/client";
import { chunkText } from "@/lib/chunker";
import { buildEvidenceBlobPath } from "@/lib/evidence-paths";
import { EVIDENCE_SUPPORTED_MIME_TYPES, MAX_EVIDENCE_FILE_BYTES } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { extractTextFromBytes } from "@/lib/extract-text";
import { sha256 } from "@/lib/fingerprint";
import { createEmbedding } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { embeddingToVectorLiteral } from "@/lib/retrieval";
import { putStoredEvidenceObject } from "@/lib/storage";
import { requireWorkspaceAccess } from "@/lib/workspaces";

function normalizeEvidenceMimeType(mimeType: string | null | undefined) {
  return mimeType?.trim() || "application/octet-stream";
}

function assertEvidenceByteSize(byteLength: number) {
  if (byteLength === 0) {
    throw new AppError("Choose a file to upload.", {
      code: "EMPTY_FILE",
      status: 400
    });
  }

  if (byteLength > MAX_EVIDENCE_FILE_BYTES) {
    throw new AppError("Evidence files must be 10 MB or smaller.", {
      code: "FILE_TOO_LARGE",
      status: 400
    });
  }
}

function assertSupportedEvidenceType(fileName: string, mimeType: string) {
  const normalizedName = fileName.trim().toLowerCase();
  const normalizedMimeType = normalizeEvidenceMimeType(mimeType).toLowerCase();

  if (
    normalizedName.endsWith(".pdf") ||
    normalizedName.endsWith(".txt") ||
    normalizedName.endsWith(".md") ||
    EVIDENCE_SUPPORTED_MIME_TYPES.has(normalizedMimeType)
  ) {
    return;
  }

  throw new AppError("Evidence upload supports PDF, TXT, and Markdown files.", {
    code: "UNSUPPORTED_EVIDENCE_FILE_TYPE",
    status: 400
  });
}

async function processDocument(params: {
  documentId: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}) {
  const extractedText = await extractTextFromBytes({
    bytes: params.bytes,
    mimeType: params.mimeType,
    fileName: params.fileName
  });

  const chunks = chunkText(extractedText);
  if (chunks.length === 0) {
    throw new AppError("We couldn't extract usable text from this document.", {
      code: "EMPTY_EXTRACTION",
      status: 400
    });
  }

  const evidenceFingerprint = sha256(params.bytes);

  await prisma.evidenceChunk.deleteMany({
    where: {
      documentId: params.documentId
    }
  });

  for (const chunk of chunks) {
    const embedding = await createEmbedding(chunk.content);
    const createdChunk = await prisma.evidenceChunk.create({
      data: {
        documentId: params.documentId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        evidenceFingerprint
      }
    });

    await prisma.$executeRawUnsafe(
      'UPDATE "EvidenceChunk" SET "embedding" = $1::vector WHERE "id" = $2',
      embeddingToVectorLiteral(embedding),
      createdChunk.id
    );
  }

  await prisma.evidenceDocument.update({
    where: {
      id: params.documentId
    },
    data: {
      status: DocumentStatus.READY,
      errorMessage: null,
      evidenceFingerprint,
      chunkCount: chunks.length
    }
  });
}

export async function listEvidenceDocuments(userId: string, workspaceSlug: string) {
  const access = await requireWorkspaceAccess(userId, workspaceSlug, "VIEW_EVIDENCE");
  const documents = await prisma.evidenceDocument.findMany({
    where: {
      workspaceId: access.workspace.id
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return {
    access,
    documents,
    readiness: {
      totalDocuments: documents.length,
      readyDocuments: documents.filter((document) => document.status === DocumentStatus.READY).length,
      processingErrors: documents.filter((document) => document.status === DocumentStatus.ERROR).length
    }
  };
}

export async function uploadEvidenceDocument(params: {
  userId: string;
  workspaceSlug: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}) {
  const access = await requireWorkspaceAccess(params.userId, params.workspaceSlug, "UPLOAD_EVIDENCE");
  const mimeType = normalizeEvidenceMimeType(params.mimeType);

  assertEvidenceByteSize(params.bytes.byteLength);
  assertSupportedEvidenceType(params.fileName, mimeType);

  const storedObject = await putStoredEvidenceObject({
    pathname: buildEvidenceBlobPath({
      workspaceId: access.workspace.id,
      uploadId: randomUUID(),
      fileName: params.fileName
    }),
    bytes: params.bytes,
    contentType: mimeType
  });

  const document = await prisma.evidenceDocument.create({
    data: {
      workspaceId: access.workspace.id,
      name: params.fileName,
      originalName: params.fileName,
      mimeType,
      storagePath: storedObject.pathname,
      byteSize: params.bytes.byteLength,
      status: DocumentStatus.PROCESSING,
      uploadedByUserId: access.userId
    }
  });

  try {
    await processDocument({
      documentId: document.id,
      fileName: params.fileName,
      mimeType,
      bytes: params.bytes
    });
  } catch (error) {
    await prisma.evidenceDocument.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.ERROR,
        errorMessage: error instanceof Error ? error.message : "Processing failed."
      }
    });
    throw error;
  }

  return prisma.evidenceDocument.findUniqueOrThrow({
    where: {
      id: document.id
    }
  });
}
