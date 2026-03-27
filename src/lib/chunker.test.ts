import { describe, expect, it } from "vitest";
import { chunkText } from "@/lib/chunker";

describe("chunkText", () => {
  it("splits long text into overlapping chunks", () => {
    const input = "alpha ".repeat(700);
    const chunks = chunkText(input, {
      maxChars: 300,
      overlapChars: 40
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.chunkIndex).toBe(0);
    expect(chunks[1]?.chunkIndex).toBe(1);
    expect(chunks.every((chunk) => chunk.content.length > 0)).toBe(true);
  });

  it("returns an empty array for blank text", () => {
    expect(chunkText("   \n  ")).toEqual([]);
  });
});
