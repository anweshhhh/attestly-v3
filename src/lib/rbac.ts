import { type WorkspaceRole } from "@/lib/domain";
import { AppError } from "@/lib/errors";

export const WorkspaceAction = {
  VIEW_HOME: "VIEW_HOME",
  VIEW_EVIDENCE: "VIEW_EVIDENCE",
  UPLOAD_EVIDENCE: "UPLOAD_EVIDENCE",
  VIEW_QUESTIONNAIRES: "VIEW_QUESTIONNAIRES",
  IMPORT_QUESTIONNAIRES: "IMPORT_QUESTIONNAIRES",
  RUN_AUTOFILL: "RUN_AUTOFILL",
  APPROVE_ANSWERS: "APPROVE_ANSWERS",
  EXPORT_RESULTS: "EXPORT_RESULTS"
} as const;

export type WorkspaceAction = (typeof WorkspaceAction)[keyof typeof WorkspaceAction];

const ROLE_WEIGHT: Record<WorkspaceRole, number> = {
  VIEWER: 1,
  REVIEWER: 2,
  ADMIN: 3,
  OWNER: 4
};

const ACTION_MIN_ROLE: Record<WorkspaceAction, WorkspaceRole> = {
  [WorkspaceAction.VIEW_HOME]: "VIEWER",
  [WorkspaceAction.VIEW_EVIDENCE]: "VIEWER",
  [WorkspaceAction.UPLOAD_EVIDENCE]: "REVIEWER",
  [WorkspaceAction.VIEW_QUESTIONNAIRES]: "VIEWER",
  [WorkspaceAction.IMPORT_QUESTIONNAIRES]: "REVIEWER",
  [WorkspaceAction.RUN_AUTOFILL]: "REVIEWER",
  [WorkspaceAction.APPROVE_ANSWERS]: "REVIEWER",
  [WorkspaceAction.EXPORT_RESULTS]: "REVIEWER"
};

export function can(role: WorkspaceRole, action: WorkspaceAction) {
  return ROLE_WEIGHT[role] >= ROLE_WEIGHT[ACTION_MIN_ROLE[action]];
}

export function assertCan(role: WorkspaceRole, action: WorkspaceAction) {
  if (!can(role, action)) {
    throw new AppError(`Requires ${ACTION_MIN_ROLE[action]} access.`, {
      code: "FORBIDDEN",
      status: 403
    });
  }
}
