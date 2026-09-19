import { config } from "../config.ts";
import { parseLlmJson } from "./json.ts";
import type { z } from "zod";

export function llmEnabled() {
  return Boolean(config.openaiKey);
}

export async function chatJson<T>(
  system: string,
  user: string,
  schema: z.ZodType<T>,
): Promise<T> {
  if (!config.openaiKey) {
    throw new Error("OPENAI_API_KEY missing");
  }
  const res = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.openaiModel,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM HTTP ${res.status}: ${body.slice(0, 400)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "";
  return parseLlmJson(content, schema);
}
