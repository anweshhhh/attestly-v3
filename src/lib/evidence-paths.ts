import path from "node:path";

function sanitizeFileName(value: string) {
  const baseName = path.basename(value).replace(/[^a-zA-Z0-9._-]+/g, "-");
  return baseName || "evidence-file";
}

export function buildEvidenceBlobPath(params: {
  workspaceId: string;
  uploadId: string;
  fileName: string;
}) {
  return `workspaces/${params.workspaceId}/evidence/${params.uploadId}/${sanitizeFileName(params.fileName)}`;
}

export function isWorkspaceEvidenceBlobPath(pathnameValue: string, workspaceId: string) {
  return pathnameValue.startsWith(`workspaces/${workspaceId}/evidence/`);
}
