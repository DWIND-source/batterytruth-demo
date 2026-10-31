// AI Coach — Claude, two ways:
//  • "server": the BatteryTruth API (api/server.py) holds the key and calls Claude server-side.
//  • "byok":   the user's own Anthropic API key, kept on their device, sent only to api.anthropic.com.

let promptCache = null;
export async function loadPrompt() {
  if (!promptCache) promptCache = await (await fetch("coach_prompt.json")).json();
  return promptCache;
}

export class AIError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

let sdkPromise = null;
async function client(apiKey) {
  if (!sdkPromise) sdkPromise = import("./vendor/anthropic-sdk.mjs");
  const { default: Anthropic } = await sdkPromise;
  return { Anthropic, c: new Anthropic({ apiKey, dangerouslyAllowBrowser: true }) };
}

function textOf(resp) {
  return resp.content.filter(b => b.type === "text").map(b => b.text).join("").trim();
}

async function callBrowser(apiKey, body) {
  const { Anthropic, c } = await client(apiKey);
  try {
    const resp = await c.beta.messages.create({
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      ...body,
    });
    if (resp.stop_reason === "refusal") throw new AIError("refusal", "The request was declined.");
    return resp;
  } catch (e) {
    if (e instanceof AIError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new AIError("auth", "Invalid API key.");
    if (e instanceof Anthropic.PermissionDeniedError) throw new AIError("auth", "This key cannot use the model.");
    if (e instanceof Anthropic.RateLimitError) throw new AIError("rate", "Too many requests, try again shortly.");
    if (e instanceof Anthropic.BadRequestError) throw new AIError("bad_request", e.message);
    if (e instanceof Anthropic.APIConnectionError) throw new AIError("network", "Cannot reach the AI service.");
    if (e instanceof Anthropic.APIError) throw new AIError("api", `AI service error ${e.status ?? ""}`.trim());
    throw e;
  }
}

async function callServer(apiBase, path, payload) {
  let r;
  try {
    r = await fetch(apiBase + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  } catch { throw new AIError("network", "Cannot reach the BatteryTruth API."); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new AIError(data.code || "api", data.detail || `API error ${r.status}`);
  return data;
}

/** Structured advice for the current scenario + plan. Returns {headline, actions[], why, watch_out}. */
export async function advise({ mode, apiKey, apiBase, context }) {
  if (mode === "server") return callServer(apiBase, "/api/coach/advise", { context });
  const p = await loadPrompt();
  const resp = await callBrowser(apiKey, {
    model: p.model,
    max_tokens: 8000,
    system: p.system,
    output_config: { effort: "low", format: { type: "json_schema", schema: p.advice_schema } },
    messages: [{ role: "user", content: "Context:\n" + JSON.stringify(context) }],
  });
  try { return JSON.parse(textOf(resp)); }
  catch { throw new AIError("format", "Unexpected AI response."); }
}

/** Follow-up chat. history = [{role:"user"|"assistant", content:string}, ...] ending with a user turn. */
export async function chat({ mode, apiKey, apiBase, context, history }) {
  if (mode === "server") return (await callServer(apiBase, "/api/coach/chat", { context, history })).reply;
  const p = await loadPrompt();
  const messages = [{ role: "user", content: "Context:\n" + JSON.stringify(context) }, { role: "assistant", content: "Got it. What would you like to know?" }, ...history];
  const resp = await callBrowser(apiKey, {
    model: p.model,
    max_tokens: 8000,
    system: p.system + p.chat_suffix,
    output_config: { effort: "low" },
    messages,
  });
  return textOf(resp);
}
