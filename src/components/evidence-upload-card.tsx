"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EvidenceUploadCard(props: { workspaceSlug: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setMessage("Choose a PDF, TXT, or Markdown file first.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const formData = new FormData();
    formData.set("workspaceSlug", props.workspaceSlug);
    formData.set("file", file);

    try {
      const response = await fetch("/api/evidence", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      setFile(null);
      setMessage("Evidence uploaded and processed.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="panel upload-panel" onSubmit={handleSubmit}>
      <div className="panel-header">
        <div>
          <h2>Upload evidence</h2>
          <p>Start with the material you want Attestly to cite back during autofill.</p>
        </div>
      </div>

      <label className="upload-dropzone" htmlFor="evidence-file">
        <span>{file ? file.name : "Choose a PDF, TXT, or Markdown file"}</span>
        <small>Up to 10 MB. Files are parsed, chunked, embedded, and made citation-ready.</small>
      </label>
      <input
        id="evidence-file"
        accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
        className="sr-only"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        type="file"
      />

      <div className="panel-actions">
        <button className="button-primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Processing..." : "Upload evidence"}
        </button>
      </div>

      {message ? <p className="inline-message">{message}</p> : null}
    </form>
  );
}
