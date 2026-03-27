export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

type LoginPageProps = {
  searchParams?: {
    callbackUrl?: string | string[];
    error?: string | string[];
  };
};

function getQueryValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (Array.isArray(value)) {
    const firstValue = value.find((entry) => entry.trim());
    return firstValue ?? null;
  }

  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect(`/w/${currentUser.access.workspace.slug}`);
  }

  const callbackUrl = getQueryValue(searchParams?.callbackUrl) ?? "/";
  const error = getQueryValue(searchParams?.error);

  return (
    <main className="auth-shell">
      <section className="auth-stage">
        <div className="auth-copy">
          <span className="eyebrow">Sign in</span>
          <h1>Start with your real evidence, not five different AI tabs.</h1>
          <p>
            Use a verified Google work identity. Your first sign-in bootstraps a private workspace with app-owned
            RBAC and workspace isolation already enforced.
          </p>
        </div>
        <div className="auth-card">
          <GoogleSignInButton callbackUrl={callbackUrl} />
          <p className="auth-note">Google account email must be verified. The first user becomes the workspace owner.</p>
          {error ? (
            <p className="auth-error">
              Google sign-in could not start. If this keeps happening after redeploy, recheck the Google callback URI and
              Vercel auth environment variables.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
