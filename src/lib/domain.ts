export const WorkspaceRole = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  REVIEWER: "REVIEWER",
  VIEWER: "VIEWER"
} as const;

export type WorkspaceRole = (typeof WorkspaceRole)[keyof typeof WorkspaceRole];

export const DocumentStatus = {
  UPLOADED: "UPLOADED",
  PROCESSING: "PROCESSING",
  READY: "READY",
  ERROR: "ERROR"
} as const;

export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const QuestionReviewStatus = {
  DRAFT: "DRAFT",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  APPROVED: "APPROVED"
} as const;

export type QuestionReviewStatus = (typeof QuestionReviewStatus)[keyof typeof QuestionReviewStatus];

export const ReuseMatchType = {
  EXACT: "EXACT",
  NEAR_EXACT: "NEAR_EXACT",
  SEMANTIC: "SEMANTIC"
} as const;

export type ReuseMatchType = (typeof ReuseMatchType)[keyof typeof ReuseMatchType];

export const AutofillRunStatus = {
  IDLE: "IDLE",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  ERROR: "ERROR"
} as const;

export type AutofillRunStatus = (typeof AutofillRunStatus)[keyof typeof AutofillRunStatus];
