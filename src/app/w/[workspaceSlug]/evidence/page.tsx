export const dynamic = "force-dynamic";

import { StatusChip } from "@/components/status-chip";
import { EvidenceUploadCard } from "@/components/evidence-upload-card";
import { listEvidenceDocuments } from "@/lib/evidence";
import { requireCurrentUser } from "@/lib/auth";

export default async function EvidencePage({ params }: { params: { workspaceSlug: string } }) {
  const currentUser = await requireCurrentUser();
  const { documents, readiness } = await listEvidenceDocuments(currentUser.user.id, params.workspaceSlug);

  return (
    <div className="page-stack">
      <EvidenceUploadCard workspaceSlug={params.workspaceSlug} />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Evidence library</h2>
            <p>Keep the source set small, current, and citation-ready.</p>
          </div>
          <div className="meta-pills">
            <StatusChip tone="neutral">{readiness.totalDocuments} total</StatusChip>
            <StatusChip tone="success">{readiness.readyDocuments} ready</StatusChip>
            {readiness.processingErrors > 0 ? <StatusChip tone="danger">{readiness.processingErrors} errors</StatusChip> : null}
          </div>
        </div>

        <div className="table-list">
          {documents.length === 0 ? (
            <div className="empty-state-card">
              <strong>No evidence uploaded yet</strong>
              <span>Upload your first source document to unlock grounded answering.</span>
            </div>
          ) : (
            documents.map((document) => (
              <article className="table-row" key={document.id}>
                <div>
                  <strong>{document.name}</strong>
                  <small>{document.mimeType}</small>
                </div>
                <div>
                  <small>{Math.max(1, Math.round(document.byteSize / 1024))} KB</small>
                </div>
                <div>
                  {document.status === "READY" ? (
                    <StatusChip tone="success">Ready</StatusChip>
                  ) : document.status === "ERROR" ? (
                    <StatusChip tone="danger">Error</StatusChip>
                  ) : (
                    <StatusChip tone="warning">{document.status}</StatusChip>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
