CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'REVIEWER', 'VIEWER');
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'READY', 'ERROR');
CREATE TYPE "QuestionReviewStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'APPROVED');
CREATE TYPE "ReuseMatchType" AS ENUM ('EXACT', 'NEAR_EXACT', 'SEMANTIC');
CREATE TYPE "AutofillRunStatus" AS ENUM ('IDLE', 'RUNNING', 'COMPLETED', 'ERROR');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastUsedWorkspaceId" TEXT,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Workspace" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Membership" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "WorkspaceRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EvidenceDocument" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
  "uploadedByUserId" TEXT NOT NULL,
  "errorMessage" TEXT,
  "evidenceFingerprint" TEXT,
  "chunkCount" INTEGER NOT NULL DEFAULT 0,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EvidenceDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EvidenceChunk" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "evidenceFingerprint" TEXT NOT NULL,
  "embedding" vector(1536),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EvidenceChunk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Questionnaire" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sourceFileName" TEXT NOT NULL,
  "questionColumn" TEXT NOT NULL,
  "originalHeaders" TEXT[],
  "totalCount" INTEGER NOT NULL DEFAULT 0,
  "answeredCount" INTEGER NOT NULL DEFAULT 0,
  "approvedCount" INTEGER NOT NULL DEFAULT 0,
  "needsReviewCount" INTEGER NOT NULL DEFAULT 0,
  "autofillStatus" "AutofillRunStatus" NOT NULL DEFAULT 'IDLE',
  "autofillCursor" INTEGER NOT NULL DEFAULT 0,
  "autofillError" TEXT,
  "lastAutofilledAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Questionnaire_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionnaireItem" (
  "id" TEXT NOT NULL,
  "questionnaireId" TEXT NOT NULL,
  "rowIndex" INTEGER NOT NULL,
  "sourceRow" JSONB NOT NULL,
  "text" TEXT NOT NULL,
  "answer" TEXT,
  "citations" JSONB NOT NULL,
  "reviewStatus" "QuestionReviewStatus" NOT NULL DEFAULT 'DRAFT',
  "draftSuggestionApplied" BOOLEAN NOT NULL DEFAULT false,
  "reusedFromApprovedAnswerId" TEXT,
  "reuseMatchType" "ReuseMatchType",
  "reusedAt" TIMESTAMP(3),
  "notFoundReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuestionnaireItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApprovedAnswer" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "sourceQuestionId" TEXT NOT NULL,
  "questionText" TEXT NOT NULL,
  "normalizedQuestionText" TEXT NOT NULL DEFAULT '',
  "questionTextHash" TEXT NOT NULL DEFAULT '',
  "questionEmbedding" vector(1536),
  "answerText" TEXT NOT NULL,
  "citationChunkIds" TEXT[],
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApprovedAnswer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApprovedAnswerEvidence" (
  "id" TEXT NOT NULL,
  "approvedAnswerId" TEXT NOT NULL,
  "chunkId" TEXT NOT NULL,
  "fingerprintAtApproval" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovedAnswerEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExportRecord" (
  "id" TEXT NOT NULL,
  "questionnaireId" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExportRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");
CREATE UNIQUE INDEX "Membership_workspaceId_userId_key" ON "Membership"("workspaceId", "userId");
CREATE INDEX "EvidenceDocument_workspaceId_createdAt_idx" ON "EvidenceDocument"("workspaceId", "createdAt");
CREATE INDEX "EvidenceDocument_workspaceId_status_idx" ON "EvidenceDocument"("workspaceId", "status");
CREATE INDEX "EvidenceChunk_documentId_idx" ON "EvidenceChunk"("documentId");
CREATE UNIQUE INDEX "EvidenceChunk_documentId_chunkIndex_key" ON "EvidenceChunk"("documentId", "chunkIndex");
CREATE INDEX "Questionnaire_workspaceId_createdAt_idx" ON "Questionnaire"("workspaceId", "createdAt");
CREATE INDEX "QuestionnaireItem_questionnaireId_reviewStatus_idx" ON "QuestionnaireItem"("questionnaireId", "reviewStatus");
CREATE UNIQUE INDEX "QuestionnaireItem_questionnaireId_rowIndex_key" ON "QuestionnaireItem"("questionnaireId", "rowIndex");
CREATE UNIQUE INDEX "ApprovedAnswer_sourceQuestionId_key" ON "ApprovedAnswer"("sourceQuestionId");
CREATE INDEX "ApprovedAnswer_workspaceId_questionTextHash_idx" ON "ApprovedAnswer"("workspaceId", "questionTextHash");
CREATE INDEX "ApprovedAnswer_workspaceId_normalizedQuestionText_idx" ON "ApprovedAnswer"("workspaceId", "normalizedQuestionText");
CREATE INDEX "ApprovedAnswerEvidence_approvedAnswerId_idx" ON "ApprovedAnswerEvidence"("approvedAnswerId");
CREATE INDEX "ApprovedAnswerEvidence_chunkId_idx" ON "ApprovedAnswerEvidence"("chunkId");
CREATE UNIQUE INDEX "ApprovedAnswerEvidence_approvedAnswerId_chunkId_key" ON "ApprovedAnswerEvidence"("approvedAnswerId", "chunkId");
CREATE INDEX "ExportRecord_questionnaireId_createdAt_idx" ON "ExportRecord"("questionnaireId", "createdAt");

ALTER TABLE "User"
  ADD CONSTRAINT "User_lastUsedWorkspaceId_fkey"
  FOREIGN KEY ("lastUsedWorkspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Membership"
  ADD CONSTRAINT "Membership_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Membership"
  ADD CONSTRAINT "Membership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EvidenceDocument"
  ADD CONSTRAINT "EvidenceDocument_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EvidenceChunk"
  ADD CONSTRAINT "EvidenceChunk_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "EvidenceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Questionnaire"
  ADD CONSTRAINT "Questionnaire_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Questionnaire"
  ADD CONSTRAINT "Questionnaire_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuestionnaireItem"
  ADD CONSTRAINT "QuestionnaireItem_questionnaireId_fkey"
  FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApprovedAnswer"
  ADD CONSTRAINT "ApprovedAnswer_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApprovedAnswerEvidence"
  ADD CONSTRAINT "ApprovedAnswerEvidence_approvedAnswerId_fkey"
  FOREIGN KEY ("approvedAnswerId") REFERENCES "ApprovedAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApprovedAnswerEvidence"
  ADD CONSTRAINT "ApprovedAnswerEvidence_chunkId_fkey"
  FOREIGN KEY ("chunkId") REFERENCES "EvidenceChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExportRecord"
  ADD CONSTRAINT "ExportRecord_questionnaireId_fkey"
  FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExportRecord"
  ADD CONSTRAINT "ExportRecord_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
