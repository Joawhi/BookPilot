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

const GROQ_MODEL_FALLBACKS = [
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "llama-3.1-8b-instant",
];

async function chatOpenAiCompat(system: string, user: string): Promise<string> {
  const models = [config.openaiModel, ...GROQ_MODEL_FALLBACKS.filter((m) => m !== config.openaiModel)];
  let lastError = "LLM request failed";
  for (const model of models) {
    const payload = {
      model,
      temperature: 0.4,
      response_format: { type: "json_object" as const },
      messages: [
        { role: "system" as const, content: system },
        { role: "user" as const, content: user },
      ],
    };
    let res = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const { response_format: _format, ...withoutFormat } = payload;
      res = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(withoutFormat),
      });
    }
    if (res.ok) {
      if (model !== config.openaiModel) {
        console.warn(`LLM model ${config.openaiModel} unavailable, using ${model}`);
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return data.choices?.[0]?.message?.content ?? "";
    }
    const body = await res.text();
    lastError = `LLM HTTP ${res.status}: ${body.slice(0, 400)}`;
    if (!/model_not_found|does not exist|not have access/i.test(body)) {
      throw new Error(lastError);
    }
  }
  throw new Error(lastError);
}

export async function chatJson<T>(
  system: string,
  user: string,
  schema: z.ZodType<T>,
): Promise<T> {
  if (!llmEnabled()) {
    throw new Error("OPENAI_API_KEY missing");
  }
  let content: string;
  if (geminiNativeUrl()) {
    try {
      content = await chatGemini(system, user);
    } catch (err) {
      console.warn("gemini native failed, trying OpenAI-compat", err);
      content = await chatOpenAiCompat(system, user);
    }
  } else {
    content = await chatOpenAiCompat(system, user);
  }
  return parseLlmJson(content, schema);
}
