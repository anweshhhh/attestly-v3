import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-config";
import { AppError } from "@/lib/errors";
import { bootstrapWorkspaceForUser, requireWorkspaceAccess } from "@/lib/workspaces";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id?.trim();
  const email = session?.user?.email?.trim().toLowerCase();

  if (!userId || !email) {
    return null;
  }

  const bootstrapped = await bootstrapWorkspaceForUser({
    email,
    name: session?.user?.name ?? null
  });

  return {
    session,
    user: bootstrapped.user,
    access: bootstrapped.access
  };
}

export async function requireCurrentUser() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }
  return currentUser;
}

export async function requireApiUser() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new AppError("Authentication required.", {
      code: "UNAUTHORIZED",
      status: 401
    });
  }
  return currentUser;
}

export async function requirePageWorkspaceAccess(workspaceSlug: string, action: Parameters<typeof requireWorkspaceAccess>[2]) {
  const currentUser = await requireCurrentUser();
  return requireWorkspaceAccess(currentUser.user.id, workspaceSlug, action);
}
