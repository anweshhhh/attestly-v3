import { exportQuestionnaireCsv } from "@/lib/questionnaires";
import { requireApiUser } from "@/lib/auth";
import { toApiErrorResponse } from "@/lib/api-response";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const workspaceSlug = new URL(request.url).searchParams.get("workspaceSlug")?.trim() || "";
    const currentUser = await requireApiUser();
    const result = await exportQuestionnaireCsv({
      userId: currentUser.user.id,
      workspaceSlug,
      questionnaireId: params.id
    });

    return new Response(result.csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.filename}"`
      }
    });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to export questionnaire.");
  }
}
