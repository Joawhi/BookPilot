import { z } from "zod";

export function parseLlmJson<T>(raw: string, schema: z.ZodType<T>): T {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("LLM returned empty output");
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  const slice = start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;
  let parsed: unknown;
  try {
    parsed = JSON.parse(slice);
  } catch {
    throw new Error("LLM returned non-JSON output");
  }
  return schema.parse(parsed);
}
