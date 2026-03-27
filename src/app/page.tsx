export const dynamic = "force-dynamic";

import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function LandingPage() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    return (
      <main className="marketing-shell">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">Attestly V3</span>
            <h1>Evidence-first answers that your team can actually trust.</h1>
            <p>
              Upload source documents, import a buyer questionnaire, let Attestly draft grounded answers with citations,
              and move through review without losing the evidence trail.
            </p>
            <div className="hero-actions">
              <Link className="button-primary" href={`/w/${currentUser.access.workspace.slug}`}>
                Open workspace
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="marketing-shell">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Minimal questionnaire core</span>
          <h1>Move from uploaded evidence to exported answers in one calm workflow.</h1>
          <p>
            Attestly keeps grounded answering, citations, approved-answer reuse, RBAC, and org isolation, then wraps
            them in a cleaner product flow built for speed.
          </p>
          <div className="hero-actions">
            <Link className="button-primary" href="/login">
              Continue with Google
            </Link>
          </div>
        </div>
        <div className="hero-panel">
          <div className="proof-grid">
            <div className="proof-card">
              <strong>Upload evidence</strong>
              <span>PDF, TXT, or Markdown documents become chunked, cited retrieval material.</span>
            </div>
            <div className="proof-card">
              <strong>Import CSV</strong>
              <span>Preserve original rows, answer in batches, and keep review state visible.</span>
            </div>
            <div className="proof-card">
              <strong>Export cleanly</strong>
              <span>Append Attestly answer, citations, and review status right into the buyer file.</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
