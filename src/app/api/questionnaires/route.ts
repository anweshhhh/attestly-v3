import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { importQuestionnaire, listQuestionnaires } from "@/lib/questionnaires";
import { toApiErrorResponse } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const workspaceSlug = new URL(request.url).searchParams.get("workspaceSlug")?.trim() || "";
    const currentUser = await requireApiUser();
    const data = await listQuestionnaires(currentUser.user.id, workspaceSlug);
    return NextResponse.json(data);
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load questionnaires.");
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await requireApiUser();
    const formData = await request.formData();
    const workspaceSlug = String(formData.get("workspaceSlug") ?? "").trim();
    const questionColumnKey = String(formData.get("questionColumnKey") ?? "").trim() || undefined;
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Questionnaire file is required." }, { status: 400 });
    }

    const questionnaire = await importQuestionnaire({
      userId: currentUser.user.id,
      workspaceSlug,
      questionColumnKey,
      fileName: file.name,
      mimeType: file.type,
      bytes: Buffer.from(await file.arrayBuffer())
    });

    return NextResponse.json({ questionnaire });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to import questionnaire.");
  }
}
