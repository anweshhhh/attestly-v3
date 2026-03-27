import { describe, expect, it } from "vitest";
import { buildQuestionnaireExportCsv, EXPORT_APPEND_HEADERS } from "@/lib/export";

describe("buildQuestionnaireExportCsv", () => {
  it("preserves original columns and appends Attestly output columns", () => {
    const csv = buildQuestionnaireExportCsv(
      ["Question", "Notes"],
      [
        {
          sourceRow: {
            Question: "Do you encrypt data at rest?",
            Notes: "critical"
          },
          answer: "Yes, AES-256 encryption is enabled for production storage.",
          citations: [
            {
              chunkId: "chunk-1",
              docName: "Security Policy",
              quotedSnippet: "Storage is encrypted using AES-256."
            }
          ],
          reviewStatus: "APPROVED"
        }
      ]
    );

    const [headerLine, rowLine] = csv.split("\n");

    expect(headerLine).toContain(EXPORT_APPEND_HEADERS[0]);
    expect(headerLine).toContain(EXPORT_APPEND_HEADERS[1]);
    expect(headerLine).toContain(EXPORT_APPEND_HEADERS[2]);
    expect(rowLine).toContain("APPROVED");
    expect(rowLine).toContain("Security Policy");
  });
});
