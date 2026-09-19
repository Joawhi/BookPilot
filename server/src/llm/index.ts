import { config } from "../config.ts";
import { parseLlmJson } from "./json.ts";
import type { z } from "zod";

export function llmEnabled() {
  const key = config.openaiKey.trim();
  if (!key) return false;
  return !/pega|your.?key|changeme|xxx|placeholder|^sk-your/i.test(key);
}

function geminiNativeUrl() {
  const base = config.openaiBaseUrl.replace(/\/openai\/?$/, "");
  if (base.includes("generativelanguage.googleapis.com")) {
    return `${base.replace(/\/$/, "")}/models/${config.openaiModel}:generateContent`;
  }
  return null;
}

function isGroq() {
  return /groq\.com/i.test(config.openaiBaseUrl);
}

function isReasoningModel(model: string) {
  return /gpt-oss|o1|o3|qwq/i.test(model);
}

async function chatGemini(system: string, user: string): Promise<string> {
  const url = geminiNativeUrl();
  if (!url) throw new Error("Not a Gemini endpoint");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": config.openaiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM HTTP ${res.status}: ${body.slice(0, 400)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

type Effort = "none" | "low" | "medium";

type CompatPayload = {
  model: string;
  temperature: number;
  max_completion_tokens: number;
  reasoning_effort?: Effort;
  response_format?: { type: "json_object" };
  messages: { role: "system" | "user"; content: string }[];
};

type ChatChoice = {
  finish_reason?: string;
  message?: { content?: string | null; reasoning?: string | null };
};

function messageText(data: { choices?: ChatChoice[] }): { text: string; finish: string } {
  const choice = data.choices?.[0];
  const msg = choice?.message ?? {};
  const text = [msg.content, msg.reasoning].filter((part) => typeof part === "string" && part.trim()).join("\n");
  return { text, finish: choice?.finish_reason ?? "unknown" };
}

async function postChat(payload: CompatPayload): Promise<{ ok: true; text: string; finish: string } | { ok: false; error: string }> {
  const headers = {
    Authorization: `Bearer ${config.openaiKey}`,
    "Content-Type": "application/json",
  };
  let res = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const { response_format: _format, ...withoutFormat } = payload;
    res = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(withoutFormat),
    });
  }
  if (!res.ok) {
    const body = await res.text();
    return {
      ok: false,
      error: `LLM HTTP ${res.status}: ${body.slice(0, 400)}`,
    };
  }
  const data = (await res.json()) as { choices?: ChatChoice[] };
  const { text, finish } = messageText(data);
  return { ok: true, text, finish };
}

async function completeModel(model: string, system: string, user: string): Promise<string> {
  const reasoning = isGroq() && isReasoningModel(model);
  const attempts: { effort?: Effort; tokens: number }[] = reasoning
    ? [
        { effort: "low", tokens: 8192 },
        { effort: "none", tokens: 16384 },
      ]
    : [{ tokens: 4096 }];

  let lastError = "LLM request failed";
  for (const attempt of attempts) {
    const payload: CompatPayload = {
      model,
      temperature: 0.4,
      max_completion_tokens: attempt.tokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    };
    if (attempt.effort) payload.reasoning_effort = attempt.effort;
    const result = await postChat(payload);
    if (!result.ok) {
      lastError = result.error;
      throw new Error(lastError);
    }
    if (result.text.trim()) return result.text;
    lastError = `LLM returned empty output (finish_reason=${result.finish})`;
    console.warn(lastError, { model, effort: attempt.effort });
  }
  throw new Error(lastError);
}

const GROQ_JSON_FALLBACKS = ["llama-3.1-8b-instant"];

function jsonModels() {
  const extras = isGroq() ? GROQ_JSON_FALLBACKS : [];
  return [config.openaiModel, ...extras.filter((m) => m !== config.openaiModel)];
}

function canFallback(message: string) {
  return /model_not_found|does not exist|not have access|empty output|non-JSON|ZodError|invalid_type/i.test(message);
}

let llmGate: Promise<void> = Promise.resolve();

function withLlmGate<T>(fn: () => Promise<T>): Promise<T> {
  const run = llmGate.then(fn, fn);
  llmGate = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function chatJson<T>(system: string, user: string, schema: z.ZodType<T>): Promise<T> {
  if (!llmEnabled()) {
    throw new Error("OPENAI_API_KEY missing");
  }
  return withLlmGate(async () => {
    if (geminiNativeUrl()) {
      try {
        return parseLlmJson(await chatGemini(system, user), schema);
      } catch (err) {
        console.warn("gemini native failed, trying OpenAI-compat", err);
      }
    }
    let lastError = "LLM request failed";
    for (const model of jsonModels()) {
      try {
        const content = await completeModel(model, system, user);
        const parsed = parseLlmJson(content, schema);
        if (model !== config.openaiModel) {
          console.warn(`LLM model ${config.openaiModel} produced unusable JSON, using ${model}`);
        }
        return parsed;
      } catch (err) {
        lastError = err instanceof Error ? err.message : "LLM request failed";
        console.warn("LLM attempt failed", model, lastError.slice(0, 180));
        if (!canFallback(lastError)) throw err instanceof Error ? err : new Error(lastError);
      }
    }
    throw new Error(lastError);
  });
}
