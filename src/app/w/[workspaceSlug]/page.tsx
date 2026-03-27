export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageWorkspaceAccess } from "@/lib/auth";

export default async function WorkspaceHomePage({ params }: { params: { workspaceSlug: string } }) {
  const access = await requirePageWorkspaceAccess(params.workspaceSlug, "VIEW_HOME");

  const [evidenceCount, readyEvidenceCount, questionnaireCount, approvedAnswersCount] = await Promise.all([
    prisma.evidenceDocument.count({
      where: {
        workspaceId: access.workspace.id
      }
    }),
    prisma.evidenceDocument.count({
      where: {
        workspaceId: access.workspace.id,
        status: "READY"
      }
    }),
    prisma.questionnaire.count({
      where: {
        workspaceId: access.workspace.id
      }
    }),
    prisma.approvedAnswer.count({
      where: {
        workspaceId: access.workspace.id
      }
    })
  ]);

  return (
    <div className="workspace-home">
      <section className="panel hero-panel-app">
        <div>
          <span className="eyebrow">Workspace control center</span>
          <h1>From source evidence to exported answers in three clean moves.</h1>
          <p>
            Upload citation-ready evidence, import a buyer CSV, then review answers with the proof visible beside the
            draft.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="button-primary" href={`/w/${params.workspaceSlug}/evidence`}>
            Upload evidence
          </Link>
          <Link className="button-secondary" href={`/w/${params.workspaceSlug}/questionnaires`}>
            Open questionnaires
          </Link>
        </div>
      </section>

      <section className="stats-grid">
        <article className="panel stat-card">
          <span>Evidence docs</span>
          <strong>{evidenceCount}</strong>
          <small>{readyEvidenceCount} citation-ready</small>
        </article>
        <article className="panel stat-card">
          <span>Questionnaires</span>
          <strong>{questionnaireCount}</strong>
          <small>Imported buyer files in this workspace</small>
        </article>
        <article className="panel stat-card">
          <span>Approved answers</span>
          <strong>{approvedAnswersCount}</strong>
          <small>Reusable answers with evidence snapshots</small>
        </article>
      </section>

      <section className="steps-grid">
        <article className="panel step-card">
          <h2>1. Evidence first</h2>
          <p>PDF, TXT, and Markdown docs are parsed, chunked, embedded, and held inside your workspace boundary.</p>
        </article>
        <article className="panel step-card">
          <h2>2. Autofill in batches</h2>
          <p>Each row first checks approved-answer reuse, then retrieval, then grounded drafting with citations.</p>
        </article>
        <article className="panel step-card">
          <h2>3. Review and export</h2>
          <p>Approve rows, preserve reuse quality, and export back into the original CSV structure with Attestly columns.</p>
        </article>
      </section>
    </div>
  );
}
