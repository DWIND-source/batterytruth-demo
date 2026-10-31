// Client for the BatteryTruth server. The AI Coach runs on the operator's server with the
// operator's chosen model; users never enter an API key.

export class AIError extends Error {
  constructor(code, message, status = 0) { super(message); this.code = code; this.status = status; }
}

export class Server {
  constructor(base, token) { this.base = (base || "").replace(/\/+$/, ""); this.token = token || ""; }

  async call(path, { method = "GET", body, auth = true, timeout = 0 } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth && this.token) headers.Authorization = "Bearer " + this.token;
    const ctl = new AbortController();
    if (timeout) setTimeout(() => ctl.abort(), timeout);
    let r;
    try { r = await fetch(this.base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ctl.signal }); }
    catch { throw new AIError("network", "Cannot reach the BatteryTruth server."); }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const code = r.status === 401 ? "auth" : r.status === 403 ? "forbidden" : r.status === 429 ? "rate" : r.status === 503 ? "unavailable" : r.status === 422 ? "refusal" : "api";
      throw new AIError(code, data.detail || `HTTP ${r.status}`, r.status);
    }
    return data;
  }

  status() { return this.call("/api/status", { auth: false, timeout: 2500 }); }
  register(profile) { return this.call("/api/v1/register", { method: "POST", body: profile, auth: false }); }
  me() { return this.call("/api/v1/me"); }
  updateMe(patch) { return this.call("/api/v1/me", { method: "PATCH", body: patch }); }
  deleteMe() { return this.call("/api/v1/me", { method: "DELETE" }); }
  location(loc) { return this.call("/api/v1/location", { method: "POST", body: loc }); }
  addSession(s) { return this.call("/api/v1/sessions", { method: "POST", body: s }); }
  sessions() { return this.call("/api/v1/sessions"); }
  deleteSession(id) { return this.call("/api/v1/sessions/" + id, { method: "DELETE" }); }
  healthCheck(rows) { return this.call("/api/health-check", { method: "POST", body: { observations: rows } }); }
  async advise(context) {
    const o = await this.call("/api/v1/coach/advise", { method: "POST", body: { context } });
    return { headline: String(o.headline ?? ""), actions: Array.isArray(o.actions) ? o.actions.map(String).slice(0, 4) : [], why: String(o.why ?? ""), watch_out: String(o.watch_out ?? "") };
  }
  async chat(context, history) { return (await this.call("/api/v1/coach/chat", { method: "POST", body: { context, history } })).reply; }
}
