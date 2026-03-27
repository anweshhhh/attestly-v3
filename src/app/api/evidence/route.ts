import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { listEvidenceDocuments, uploadEvidenceDocument } from "@/lib/evidence";
import { toApiErrorResponse } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const workspaceSlug = new URL(request.url).searchParams.get("workspaceSlug")?.trim() || "";
    const currentUser = await requireApiUser();
    const data = await listEvidenceDocuments(currentUser.user.id, workspaceSlug);
    return NextResponse.json(data);
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load evidence.");
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await requireApiUser();
    const formData = await request.formData();
    const workspaceSlug = String(formData.get("workspaceSlug") ?? "").trim();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Evidence file is required." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const document = await uploadEvidenceDocument({
      userId: currentUser.user.id,
      workspaceSlug,
      fileName: file.name,
      mimeType: file.type,
      bytes
    });

    return NextResponse.json({ document });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to upload evidence.");
  }
}
