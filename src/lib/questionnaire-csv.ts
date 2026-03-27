import Papa from "papaparse";
import { AppError } from "@/lib/errors";

export type QuestionnaireCsvHeader = {
  key: string;
  label: string;
  columnIndex: number;
};

export type QuestionnaireCsvRow = {
  sourceRowNumber: number;
  cells: Record<string, string>;
};

export type QuestionnaireImportPreview = {
  headers: QuestionnaireCsvHeader[];
  rows: QuestionnaireCsvRow[];
  suggestedQuestionColumnKey: string;
};

const QUESTION_HEADER_HINTS = ["question", "prompt", "security question", "requirement", "control"];

function stripBom(input: string) {
  return input.replace(/^\uFEFF/, "");
}

function normalizeHeaderKey(label: string, columnIndex: number) {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return base || `column_${columnIndex + 1}`;
}

function buildHeaders(firstRow: string[]) {
  const seen = new Map<string, number>();

  return firstRow.map<QuestionnaireCsvHeader>((value, columnIndex) => {
    const label = value.trim() || `Column ${columnIndex + 1}`;
    const baseKey = normalizeHeaderKey(label, columnIndex);
    const nextCount = (seen.get(baseKey) ?? 0) + 1;
    seen.set(baseKey, nextCount);

    return {
      key: nextCount === 1 ? baseKey : `${baseKey}_${nextCount}`,
      label,
      columnIndex
    };
  });
}

function suggestQuestionColumn(headers: QuestionnaireCsvHeader[]) {
  const scored = headers.map((header) => {
    const lowerLabel = header.label.toLowerCase();
    let score = 0;
    for (const hint of QUESTION_HEADER_HINTS) {
      if (lowerLabel.includes(hint)) {
        score += hint.length;
      }
    }
    return { key: header.key, score };
  });

  scored.sort((left, right) => right.score - left.score);
  return scored[0]?.score ? scored[0].key : headers[0]?.key ?? "";
}

export function parseQuestionnaireCsv(params: {
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}): QuestionnaireImportPreview {
  const normalizedName = params.fileName.trim().toLowerCase();
  if (!normalizedName.endsWith(".csv")) {
    throw new AppError("Questionnaire import accepts CSV files only.", {
      code: "UNSUPPORTED_QUESTIONNAIRE_FILE_TYPE",
      status: 400
    });
  }

  const parsed = Papa.parse<string[]>(stripBom(params.bytes.toString("utf8")), {
    header: false,
    skipEmptyLines: "greedy"
  });

  if (parsed.errors.length > 0) {
    throw new AppError(`CSV parse error: ${parsed.errors[0].message}`, {
      code: "QUESTIONNAIRE_PARSE_ERROR",
      status: 400
    });
  }

  if (!parsed.data.length) {
    throw new AppError("The uploaded CSV is empty.", {
      code: "EMPTY_QUESTIONNAIRE_CSV",
      status: 400
    });
  }

  const headers = buildHeaders(parsed.data[0].map((value) => String(value ?? "")));
  const rows = parsed.data.slice(1).map<QuestionnaireCsvRow>((row, rowIndex) => {
    const cells: Record<string, string> = {};
    headers.forEach((header, columnIndex) => {
      cells[header.key] = String(row[columnIndex] ?? "").trim();
    });

    return {
      sourceRowNumber: rowIndex + 2,
      cells
    };
  });

  return {
    headers,
    rows,
    suggestedQuestionColumnKey: suggestQuestionColumn(headers)
  };
}
