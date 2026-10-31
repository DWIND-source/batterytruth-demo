// AI Coach — works with Claude or any OpenAI-compatible provider.
//  • "server": the BatteryTruth API (api/server.py) holds the key and calls the AI server-side.
//  • "byok":   the user's own key for the provider they choose; it stays on their device and is
//              sent only to that provider's API address.

export const PROVIDERS = {
  anthropic:  { name: "Anthropic Claude", base: "https://api.anthropic.com", model: "claude-opus-5-5", keyUrl: "https://console.anthropic.com/settings/keys", kind: "anthropic" },
  openai:     { name: "OpenAI", base: "https://api.openai.com/v1", model: "gpt-5.4-mini", keyUrl: "https://platform.openai.com/api-keys" },
  gemini:     { name: "Google Gemini", base: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-3.6-flash", keyUrl: "https://aistudio.google.com/apikey" },
  openrouter: { name: "OpenRouter", base: "https://openrouter.ai/api/v1", model: "openrouter/auto", keyUrl: "https://openrouter.ai/keys" },
  groq:       { name: "Groq", base: "https://api.groq.com/openai/v1", model: "openai/gpt-oss-120b", keyUrl: "https://console.groq.com/keys" },
  deepseek:   { name: "DeepSeek", base: "https://api.deepseek.com/v1", model: "deepseek-chat", keyUrl: "https://platform.deepseek.com/api_keys" },
  mistral:    { name: "Mistral", base: "https://api.mistral.ai/v1", model: "mistral-small-latest", keyUrl: "https://console.mistral.ai/api-keys" },
  ollama:     { name: "Ollama (local)", base: "http://localhost:11434/v1", model: "llama3.2", keyUrl: "https://ollama.com/download", keyless: true, editableBase: true },
  custom:     { name: "Custom (OpenAI-compatible)", base: "", model: "", keyUrl: "", keyless: true, editableBase: true },
};

let promptCache = null;
export async function loadPrompt() {
  if (!promptCache) promptCache = await (await fetch("coach_prompt.json")).json();
  return promptCache;
}

export class AIError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

function parseJSON(text) {
  const t = String(text).trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try { return JSON.parse(t); } catch {}
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch {} }
  throw new AIError("format", "Unexpected AI response.");
}

function normaliseAdvice(o) {
  return {
    headline: String(o.headline ?? ""),
    actions: Array.isArray(o.actions) ? o.actions.map(String).slice(0, 4) : [],
    why: String(o.why ?? ""),
    watch_out: String(o.watch_out ?? ""),
  };
}

/* ---------------- Anthropic Claude (official SDK) ---------------- */
let sdkPromise = null;
async function anthropicCall(cfg, body) {
  if (!sdkPromise) sdkPromise = import("./vendor/anthropic-sdk.mjs");
  const { default: Anthropic } = await sdkPromise;
  const c = new Anthropic({ apiKey: cfg.apiKey, dangerouslyAllowBrowser: true });
  try {
    const resp = await c.beta.messages.create({
      model: cfg.model || PROVIDERS.anthropic.model,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      ...body,
    });
    if (resp.stop_reason === "refusal") throw new AIError("refusal", "The request was declined.");
    return resp.content.filter(b => b.type === "text").map(b => b.text).join("").trim();
  } catch (e) {
    if (e instanceof AIError) throw e;
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw new AIError("auth", "Invalid API key.");
    if (e instanceof Anthropic.NotFoundError) throw new AIError("model", "Model not found.");
    if (e instanceof Anthropic.RateLimitError) throw new AIError("rate", "Too many requests, try again shortly.");
    if (e instanceof Anthropic.BadRequestError) throw new AIError("bad_request", e.message);
    if (e instanceof Anthropic.APIConnectionError) throw new AIError("network", "Cannot reach the AI service.");
    if (e instanceof Anthropic.APIError) throw new AIError("api", `AI service error ${e.status ?? ""}`.trim());
    throw e;
  }
}

/* ---------------- any OpenAI-compatible provider ---------------- */
async function compatCall(cfg, messages, wantJSON) {
  const base = (cfg.baseURL || PROVIDERS[cfg.provider]?.base || "").replace(/\/+$/, "");
  if (!base) throw new AIError("config", "Enter the provider's API address.");
  const model = cfg.model || PROVIDERS[cfg.provider]?.model;
  if (!model) throw new AIError("config", "Enter a model name.");
  const headers = { "Content-Type": "application/json" };
  if (cfg.apiKey) headers.Authorization = "Bearer " + cfg.apiKey;
  if (cfg.provider === "openrouter") { headers["HTTP-Referer"] = location.origin; headers["X-Title"] = "BatteryTruth"; }
  const send = async jsonMode => {
    let r;
    try {
      r = await fetch(base + "/chat/completions", {
        method: "POST", headers,
        body: JSON.stringify({ model, messages, ...(jsonMode ? { response_format: { type: "json_object" } } : {}) }),
      });
    } catch { throw new AIError("network", "Cannot reach the provider (network or browser access blocked)."); }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = data?.error?.message || data?.message || `HTTP ${r.status}`;
      if (r.status === 401 || r.status === 403) throw new AIError("auth", msg);
      if (r.status === 404) throw new AIError("model", msg);
      if (r.status === 429) throw new AIError("rate", msg);
      throw new AIError(r.status === 400 ? "bad_request" : "api", msg);
    }
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) throw new AIError("format", "Empty AI response.");
    return text.trim();
  };
  if (!wantJSON) return send(false);
  try { return await send(true); }
  catch (e) { if (e instanceof AIError && e.code === "bad_request") return send(false); throw e; } // provider without JSON mode
}

/** Lists model ids the key can use (OpenAI-compatible providers). */
export async function listModels(cfg) {
  if (PROVIDERS[cfg.provider]?.kind === "anthropic") return [PROVIDERS.anthropic.model];
  const base = (cfg.baseURL || PROVIDERS[cfg.provider]?.base || "").replace(/\/+$/, "");
  let r;
  try { r = await fetch(base + "/models", { headers: cfg.apiKey ? { Authorization: "Bearer " + cfg.apiKey } : {} }); }
  catch { throw new AIError("network", "Cannot reach the provider."); }
  if (r.status === 401 || r.status === 403) throw new AIError("auth", "Invalid API key.");
  if (!r.ok) throw new AIError("api", `HTTP ${r.status}`);
  const data = await r.json();
  return (data.data || data.models || []).map(m => (m.id || m.name || "").replace(/^models\//, "")).filter(Boolean).sort();
}

/* ---------------- BatteryTruth API ---------------- */
async function callServer(apiBase, path, payload) {
  let r;
  try {
    r = await fetch(apiBase + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  } catch { throw new AIError("network", "Cannot reach the BatteryTruth API."); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new AIError(data.code || "api", data.detail || `API error ${r.status}`);
  return data;
}

/* ---------------- public API ---------------- */
/** Structured advice for the current scenario + plan. Returns {headline, actions[], why, watch_out}. */
export async function advise(cfg) {
  if (cfg.mode === "server") return normaliseAdvice(await callServer(cfg.apiBase, "/api/coach/advise", { context: cfg.context }));
  const p = await loadPrompt();
  const user = "Context:\n" + JSON.stringify(cfg.context);
  if (PROVIDERS[cfg.provider]?.kind === "anthropic") {
    const text = await anthropicCall(cfg, {
      system: p.system,
      output_config: { effort: "low", format: { type: "json_schema", schema: p.advice_schema } },
      messages: [{ role: "user", content: user }],
    });
    return normaliseAdvice(parseJSON(text));
  }
  const text = await compatCall(cfg, [{ role: "system", content: p.system + p.json_instruction }, { role: "user", content: user }], true);
  return normaliseAdvice(parseJSON(text));
}

/** Follow-up chat. history = [{role:"user"|"assistant", content:string}, ...] ending with a user turn. */
export async function chat(cfg) {
  if (cfg.mode === "server") return (await callServer(cfg.apiBase, "/api/coach/chat", { context: cfg.context, history: cfg.history })).reply;
  const p = await loadPrompt();
  const opening = [{ role: "user", content: "Context:\n" + JSON.stringify(cfg.context) }, { role: "assistant", content: "Got it. What would you like to know?" }];
  if (PROVIDERS[cfg.provider]?.kind === "anthropic") {
    return anthropicCall(cfg, { system: p.system + p.chat_suffix, output_config: { effort: "low" }, messages: [...opening, ...cfg.history] });
  }
  return compatCall(cfg, [{ role: "system", content: p.system + p.chat_suffix }, ...opening, ...cfg.history], false);
}
