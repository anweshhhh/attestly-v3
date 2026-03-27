export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requirePageWorkspaceAccess } from "@/lib/auth";

export default async function WorkspaceLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { workspaceSlug: string };
}) {
  const access = await requirePageWorkspaceAccess(params.workspaceSlug, "VIEW_HOME").catch(() => null);
  if (!access) {
    notFound();
  }

  return (
    <AppShell workspaceName={access.workspace.name} workspaceSlug={params.workspaceSlug}>
      {children}
    </AppShell>
  );
}
