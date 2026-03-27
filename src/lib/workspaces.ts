import { WorkspaceRole } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { assertCan, type WorkspaceAction } from "@/lib/rbac";

export type WorkspaceAccess = {
  userId: string;
  role: WorkspaceRole;
  membershipId: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
  };
};

function slugifyWorkspaceName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function createUniqueWorkspaceSlug(baseName: string) {
  const baseSlug = slugifyWorkspaceName(baseName) || "workspace";

  for (let index = 0; index < 100; index += 1) {
    const candidate = index === 0 ? baseSlug : `${baseSlug}-${index + 1}`;
    const existing = await prisma.workspace.findUnique({
      where: { slug: candidate },
      select: { id: true }
    });
    if (!existing) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now()}`;
}

function buildWorkspaceName(params: { email: string; name?: string | null }) {
  const trimmedName = params.name?.trim();
  if (trimmedName) {
    return `${trimmedName}'s workspace`;
  }

  const localPart = params.email.split("@")[0]?.trim();
  if (localPart) {
    return `${localPart}'s workspace`;
  }

  return "Attestly workspace";
}

export async function ensureUserIdentity(params: { email: string; name?: string | null }) {
  const normalizedEmail = params.email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new AppError("Email is required.", {
      code: "INVALID_EMAIL",
      status: 400
    });
  }

  return prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      name: params.name?.trim() || undefined
    },
    create: {
      email: normalizedEmail,
      name: params.name?.trim() || null
    }
  });
}

export async function bootstrapWorkspaceForUser(params: { email: string; name?: string | null }) {
  const user = await ensureUserIdentity(params);
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  if (memberships.length === 0) {
    const workspaceName = buildWorkspaceName(params);
    const workspaceSlug = await createUniqueWorkspaceSlug(workspaceName);
    const workspace = await prisma.workspace.create({
      data: {
        name: workspaceName,
        slug: workspaceSlug
      }
    });

    const membership = await prisma.membership.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: WorkspaceRole.OWNER
      }
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastUsedWorkspaceId: workspace.id
      }
    });

    return {
      user,
      access: {
        userId: user.id,
        membershipId: membership.id,
        role: membership.role,
        workspace
      }
    };
  }

  const activeMembership =
    memberships.find((membership) => membership.workspace.id === user.lastUsedWorkspaceId) ?? memberships[0];

  if (user.lastUsedWorkspaceId !== activeMembership.workspace.id) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastUsedWorkspaceId: activeMembership.workspace.id
      }
    });
  }

  return {
    user,
    access: {
      userId: user.id,
      membershipId: activeMembership.id,
      role: activeMembership.role,
      workspace: activeMembership.workspace
    }
  };
}

export async function requireWorkspaceAccess(userId: string, workspaceSlug: string, action: WorkspaceAction): Promise<WorkspaceAccess> {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      workspace: {
        slug: workspaceSlug
      }
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });

  if (!membership) {
    throw new AppError("Workspace not found.", {
      code: "WORKSPACE_NOT_FOUND",
      status: 404
    });
  }

  assertCan(membership.role, action);

  return {
    userId,
    membershipId: membership.id,
    role: membership.role,
    workspace: membership.workspace
  };
}
