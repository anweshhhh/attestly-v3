import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getQuestionnairePageData } from "@/lib/questionnaires";
import { toApiErrorResponse } from "@/lib/api-response";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const workspaceSlug = new URL(request.url).searchParams.get("workspaceSlug")?.trim() || "";
    const currentUser = await requireApiUser();
    const data = await getQuestionnairePageData(currentUser.user.id, workspaceSlug, params.id);
    return NextResponse.json({
      questionnaire: data.questionnaire,
      items: data.items
    });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load questionnaire.");
  }
}
