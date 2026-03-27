"use client";

import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusChip } from "@/components/status-chip";

type Citation = {
  docName: string;
  chunkId: string;
  quotedSnippet: string;
};

type WorkbenchItem = {
  id: string;
  rowIndex: number;
  text: string;
  answer: string | null;
  citations: Citation[];
  reviewStatus: "DRAFT" | "NEEDS_REVIEW" | "APPROVED";
  reuseMatchType: "EXACT" | "NEAR_EXACT" | "SEMANTIC" | null;
};

type WorkbenchData = {
  questionnaire: {
    id: string;
    name: string;
    totalCount: number;
    answeredCount: number;
    approvedCount: number;
    needsReviewCount: number;
    autofillStatus: string;
    autofillCursor: number;
  };
  items: WorkbenchItem[];
};

export function QuestionnaireWorkbench(props: {
  workspaceSlug: string;
  initialData: WorkbenchData;
}) {
  const router = useRouter();
  const [data, setData] = useState(props.initialData);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [draftAnswer, setDraftAnswer] = useState(props.initialData.items[0]?.answer ?? "");
  const [message, setMessage] = useState("");
  const [isMutating, setIsMutating] = useState(false);
  const submitReviewRef = useRef<(reviewStatus: "APPROVED" | "NEEDS_REVIEW") => Promise<void>>(async () => {});

  const selectedItem = data.items[selectedIndex] ?? null;

  useEffect(() => {
    setData(props.initialData);
  }, [props.initialData]);

  useEffect(() => {
    setDraftAnswer(selectedItem?.answer ?? "");
  }, [selectedItem?.id, selectedItem?.answer]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const isTextInput =
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "INPUT" ||
        target?.getAttribute("contenteditable") === "true";

      if (event.shiftKey && event.key.toLowerCase() === "j") {
        event.preventDefault();
        setSelectedIndex((current) => Math.max(0, current - 1));
        return;
      }

      if (event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSelectedIndex((current) => Math.min(data.items.length - 1, current + 1));
        return;
      }

      if (isTextInput) {
        return;
      }

      if (event.shiftKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        void submitReviewRef.current("APPROVED");
      }

      if (event.shiftKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        void submitReviewRef.current("NEEDS_REVIEW");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [data.items.length]);

  const progressText = useMemo(() => {
    return `${data.questionnaire.approvedCount}/${data.questionnaire.totalCount} approved`;
  }, [data.questionnaire.approvedCount, data.questionnaire.totalCount]);

  async function refreshWorkbench() {
    const response = await fetch(
      `/api/questionnaires/${data.questionnaire.id}?workspaceSlug=${encodeURIComponent(props.workspaceSlug)}`,
      {
        cache: "no-store"
      }
    );

    const payload = (await response.json()) as WorkbenchData & { error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to refresh questionnaire.");
    }

    setData(payload);
    return payload;
  }

  async function runAutofillBatch() {
    setIsMutating(true);
    setMessage("");
    try {
      const response = await fetch(`/api/questionnaires/${data.questionnaire.id}/autofill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          workspaceSlug: props.workspaceSlug
        })
      });

      const payload = (await response.json()) as WorkbenchData & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Autofill failed.");
      }

      setData(payload);
      setMessage("Autofill batch completed.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Autofill failed.");
    } finally {
      setIsMutating(false);
    }
  }

  const submitReview = useCallback(async (reviewStatus: "APPROVED" | "NEEDS_REVIEW") => {
    if (!selectedItem) {
      return;
    }

    setIsMutating(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/questionnaires/${data.questionnaire.id}/items/${selectedItem.id}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            workspaceSlug: props.workspaceSlug,
            answer: draftAnswer,
            reviewStatus
          })
        }
      );

      const payload = (await response.json()) as WorkbenchData & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Review update failed.");
      }

      setData(payload);
      setMessage(reviewStatus === "APPROVED" ? "Answer approved." : "Marked for review.");
      setSelectedIndex((current) => Math.min(payload.items.length - 1, current + 1));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review update failed.");
    } finally {
      setIsMutating(false);
    }
  }, [draftAnswer, props.workspaceSlug, router, selectedItem, data.questionnaire.id]);

  submitReviewRef.current = submitReview;

  async function exportCsv() {
    window.location.href = `/api/questionnaires/${data.questionnaire.id}/export?workspaceSlug=${encodeURIComponent(props.workspaceSlug)}`;
    setTimeout(() => {
      void refreshWorkbench();
    }, 600);
  }

  if (!selectedItem) {
    return null;
  }

  return (
    <div className="workbench-shell">
      <div className="workbench-topbar panel">
        <div>
          <h1>{data.questionnaire.name}</h1>
          <p>Review queue with evidence on the right, writing surface in the middle, and keyboard-first movement.</p>
        </div>
        <div className="workbench-summary">
          <strong>{progressText}</strong>
          <span>{data.questionnaire.needsReviewCount} need review</span>
        </div>
      </div>

      <div className="workbench-toolbar panel">
        <div className="toolbar-shortcuts">
          <span>Shortcuts</span>
          <small>Shift+J previous</small>
          <small>Shift+K next</small>
          <small>Shift+A approve</small>
          <small>Shift+R needs review</small>
        </div>
        <div className="toolbar-actions">
          <button className="button-secondary" disabled={isMutating} onClick={() => void runAutofillBatch()} type="button">
            {isMutating ? "Working..." : "Run autofill batch"}
          </button>
          <button className="button-secondary" onClick={exportCsv} type="button">
            Export CSV
          </button>
        </div>
      </div>

      {message ? <p className="inline-message panel">{message}</p> : null}

      <div className="workbench-grid">
        <section className="panel queue-panel" aria-label="Question queue">
          <div className="panel-header">
            <div>
              <h2>Queue</h2>
              <p>Select a row, then approve and advance without losing evidence context.</p>
            </div>
          </div>
          <div className="queue-list">
            {data.items.map((item, index) => (
              <button
                className={clsx("queue-row", index === selectedIndex && "queue-row-active")}
                key={item.id}
                onClick={() => setSelectedIndex(index)}
                type="button"
              >
                <div className="queue-row-top">
                  <strong>Row {item.rowIndex + 1}</strong>
                  {item.reviewStatus === "APPROVED" ? (
                    <StatusChip tone="success">Approved</StatusChip>
                  ) : item.reviewStatus === "NEEDS_REVIEW" ? (
                    <StatusChip tone="warning">Needs review</StatusChip>
                  ) : (
                    <StatusChip tone="neutral">Draft</StatusChip>
                  )}
                </div>
                <p>{item.text}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="panel answer-panel" aria-label="Answer editor">
          <div className="panel-header">
            <div>
              <h2>Answer</h2>
              <p>Keep the answer faithful to cited evidence. Approvals feed the reuse library automatically.</p>
            </div>
            {selectedItem.reuseMatchType ? <StatusChip tone="success">Reuse {selectedItem.reuseMatchType}</StatusChip> : null}
          </div>

          <div className="question-card">
            <span className="eyebrow">Selected question</span>
            <p>{selectedItem.text}</p>
          </div>

          <label className="field-label" htmlFor="answer-editor">
            Draft answer
          </label>
          <textarea
            id="answer-editor"
            onChange={(event) => setDraftAnswer(event.target.value)}
            rows={12}
            value={draftAnswer}
          />

          <div className="panel-actions">
            <button className="button-primary" disabled={isMutating} onClick={() => void submitReview("APPROVED")} type="button">
              Approve &amp; next
            </button>
            <button className="button-secondary" disabled={isMutating} onClick={() => void submitReview("NEEDS_REVIEW")} type="button">
              Mark needs review
            </button>
          </div>
        </section>

        <aside className="panel evidence-panel" aria-label="Evidence drawer">
          <div className="panel-header">
            <div>
              <h2>Evidence</h2>
              <p>Citations stay adjacent to the answer so reviewers never have to guess why something was drafted.</p>
            </div>
          </div>

          {selectedItem.citations.length === 0 ? (
            <div className="empty-state-card">
              <strong>No citations yet</strong>
              <span>Run autofill or mark this row for manual review.</span>
            </div>
          ) : (
            <div className="citation-list">
              {selectedItem.citations.map((citation) => (
                <article className="citation-card" key={`${citation.chunkId}-${citation.docName}`}>
                  <div className="citation-meta">
                    <strong>{citation.docName}</strong>
                    <small>{citation.chunkId}</small>
                  </div>
                  <p>{citation.quotedSnippet}</p>
                </article>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
