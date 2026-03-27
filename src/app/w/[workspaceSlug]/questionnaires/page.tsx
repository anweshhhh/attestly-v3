export const dynamic = "force-dynamic";

import Link from "next/link";
import { QuestionnaireImportCard } from "@/components/questionnaire-import-card";
import { StatusChip } from "@/components/status-chip";
import { listQuestionnaires } from "@/lib/questionnaires";
import { requireCurrentUser } from "@/lib/auth";

export default async function QuestionnairesPage({ params }: { params: { workspaceSlug: string } }) {
  const currentUser = await requireCurrentUser();
  const { questionnaires } = await listQuestionnaires(currentUser.user.id, params.workspaceSlug);

  return (
    <div className="page-stack">
      <QuestionnaireImportCard workspaceSlug={params.workspaceSlug} />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Questionnaires</h2>
            <p>Each imported CSV keeps its original headers while Attestly appends answers, citations, and review state.</p>
          </div>
        </div>

        <div className="table-list">
          {questionnaires.length === 0 ? (
            <div className="empty-state-card">
              <strong>No questionnaires imported yet</strong>
              <span>Bring in a buyer CSV once evidence is ready.</span>
            </div>
          ) : (
            questionnaires.map((questionnaire) => (
              <article className="table-row table-row-spread" key={questionnaire.id}>
                <div>
                  <strong>{questionnaire.name}</strong>
                  <small>{questionnaire.totalCount} rows</small>
                </div>
                <div className="row-meta">
                  <StatusChip tone="neutral">{questionnaire.answeredCount} answered</StatusChip>
                  <StatusChip tone="success">{questionnaire.approvedCount} approved</StatusChip>
                  {questionnaire.needsReviewCount > 0 ? (
                    <StatusChip tone="warning">{questionnaire.needsReviewCount} needs review</StatusChip>
                  ) : null}
                </div>
                <Link className="button-secondary" href={`/w/${params.workspaceSlug}/questionnaires/${questionnaire.id}`}>
                  Open workbench
                </Link>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
