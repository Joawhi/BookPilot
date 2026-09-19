import { describe, expect, it } from "vitest";
import { parseLlmJson } from "../llm/json.ts";
import { z } from "zod";

describe("parseLlmJson", () => {
  const schema = z.object({ hello: z.string() });

  it("parses fenced json", () => {
    expect(parseLlmJson("```json\n{\"hello\":\"world\"}\n```", schema)).toEqual({ hello: "world" });
  });

  it("extracts object from prose", () => {
    expect(parseLlmJson("Sure: {\"hello\":\"x\"} thanks", schema).hello).toBe("x");
  });

  it("rejects empty output", () => {
    expect(() => parseLlmJson("   ", schema)).toThrow(/empty output/);
  });
});
