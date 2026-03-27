export const dynamic = "force-dynamic";

import { QuestionnaireWorkbench } from "@/components/questionnaire-workbench";
import { requireCurrentUser } from "@/lib/auth";
import { getQuestionnairePageData } from "@/lib/questionnaires";

export default async function QuestionnaireDetailPage({
  params
}: {
  params: { workspaceSlug: string; questionnaireId: string };
}) {
  const currentUser = await requireCurrentUser();
  const data = await getQuestionnairePageData(currentUser.user.id, params.workspaceSlug, params.questionnaireId);

  return (
    <QuestionnaireWorkbench
      initialData={{
        questionnaire: {
          id: data.questionnaire.id,
          name: data.questionnaire.name,
          totalCount: data.questionnaire.totalCount,
          answeredCount: data.questionnaire.answeredCount,
          approvedCount: data.questionnaire.approvedCount,
          needsReviewCount: data.questionnaire.needsReviewCount,
          autofillStatus: data.questionnaire.autofillStatus,
          autofillCursor: data.questionnaire.autofillCursor
        },
        items: data.items.map((item) => ({
          id: item.id,
          rowIndex: item.rowIndex,
          text: item.text,
          answer: item.answer,
          citations: item.citations,
          reviewStatus: item.reviewStatus,
          reuseMatchType: item.reuseMatchType
        }))
      }}
      workspaceSlug={params.workspaceSlug}
    />
  );
}
