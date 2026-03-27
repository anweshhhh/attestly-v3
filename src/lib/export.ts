import type { Citation } from "@/lib/answer-engine";

export const EXPORT_APPEND_HEADERS = ["Attestly Answer", "Attestly Citations", "Attestly Review Status"];

export function escapeCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function formatCitationsCompact(citations: Citation[]) {
  return citations
    .map((citation) => `${citation.docName} [${citation.chunkId}]: ${citation.quotedSnippet}`)
    .join(" | ");
}

export function buildQuestionnaireExportCsv(
  originalHeaders: string[],
  rows: Array<{
    sourceRow: Record<string, string>;
    answer: string;
    citations: Citation[];
    reviewStatus: string;
  }>
) {
  const headerLine = [...originalHeaders, ...EXPORT_APPEND_HEADERS].map(escapeCsvValue).join(",");

  const dataLines = rows.map((row) => {
    const sourceColumns = originalHeaders.map((header) => escapeCsvValue(row.sourceRow[header] ?? ""));
    const appendedColumns = [
      escapeCsvValue(row.answer),
      escapeCsvValue(formatCitationsCompact(row.citations)),
      escapeCsvValue(row.reviewStatus)
    ];
    return [...sourceColumns, ...appendedColumns].join(",");
  });

  return [headerLine, ...dataLines].join("\n");
}
