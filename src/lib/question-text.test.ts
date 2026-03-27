import { describe, expect, it } from "vitest";
import { buildQuestionTextMetadata, questionTextNearExactSimilarity } from "@/lib/question-text";

describe("question text helpers", () => {
  it("normalizes text deterministically", () => {
    const metadata = buildQuestionTextMetadata("Do you support SSO for admin users?");
    expect(metadata.normalizedQuestionText).toBe("do you support sso for admin users");
    expect(metadata.questionTextHash.length).toBeGreaterThan(20);
  });

  it("scores near-exact similarity above unrelated text", () => {
    const similar = questionTextNearExactSimilarity(
      "do you support sso for admin users",
      "please describe whether you support sso for admin users"
    );
    const different = questionTextNearExactSimilarity(
      "do you support sso for admin users",
      "what uptime sla do you provide"
    );

    expect(similar).toBeGreaterThan(different);
  });
});
