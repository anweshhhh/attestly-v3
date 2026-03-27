export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect(`/w/${currentUser.access.workspace.slug}`);
  }

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
          <Link className="button-primary" href="/api/auth/signin/google">
            Continue with Google
          </Link>
          <p className="auth-note">Google account email must be verified. The first user becomes the workspace owner.</p>
        </div>
      </section>
    </main>
  );
}
