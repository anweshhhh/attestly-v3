import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { parseQuestionnaireCsv } from "@/lib/questionnaire-csv";

describe("parseQuestionnaireCsv", () => {
  it("parses headers, rows, and suggests a question column", () => {
    const preview = parseQuestionnaireCsv({
      fileName: "buyer-questionnaire.csv",
      mimeType: "text/csv",
      bytes: Buffer.from("Question,Notes\nDo you encrypt data?,yes\nDo you log admin actions?,sometimes")
    });

    expect(preview.headers.map((header) => header.label)).toEqual(["Question", "Notes"]);
    expect(preview.rows).toHaveLength(2);
    expect(preview.suggestedQuestionColumnKey).toBe("question");
  });

  it("rejects non-csv files", () => {
    expect(() =>
      parseQuestionnaireCsv({
        fileName: "buyer-questionnaire.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        bytes: Buffer.from("not-used")
      })
    ).toThrow(AppError);
  });
});
