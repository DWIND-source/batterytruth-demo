"""BatteryTruth API — serves the web app, the battery health-check model and the AI Coach.

Run (from Project_Demo_Local):
    pip install -r api/requirements.txt
    python api/server.py                     -> http://127.0.0.1:8787/app/

AI provider (environment variables):
    Claude:  ANTHROPIC_API_KEY=sk-ant-...                     (default model claude-opus-5-5)
    Any OpenAI-compatible provider (OpenAI, Gemini, OpenRouter, Groq, DeepSeek, Mistral, Ollama, ...):
             BT_AI_BASE_URL=https://api.openai.com/v1   BT_AI_MODEL=gpt-5.4-mini   BT_AI_KEY=sk-...
    BT_AI_MODEL also overrides the Claude model.

Endpoints
    GET  /api/status          service, model and AI availability
    POST /api/health-check    {"observations": [[elapsed_s, voltage_V, current_A], ...]}
    POST /api/coach/advise    {"context": {...}}            -> {headline, actions, why, watch_out}
    POST /api/coach/chat      {"context": {...}, "history": [{role, content}, ...]} -> {reply}

The health-check math is identical to app/engine.js (both use app/model.json).
"""

import json
import os
from pathlib import Path

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

try:
    import anthropic
except ImportError:  # the model endpoints still work without the AI package
    anthropic = None
import httpx

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app"
MODEL = json.loads((APP / "model.json").read_text(encoding="utf-8"))
PROMPT = json.loads((APP / "coach_prompt.json").read_text(encoding="utf-8"))
MAX_HALFWIDTH_AH = 0.5
COMPAT_BASE = os.environ.get("BT_AI_BASE_URL", "").rstrip("/")
COMPAT_KEY = os.environ.get("BT_AI_KEY", "")
AI_PROVIDER = "compat" if COMPAT_BASE else "anthropic"
AI_MODEL = os.environ.get("BT_AI_MODEL") or (PROMPT["model"] if AI_PROVIDER == "anthropic" else "")

app = FastAPI(title="BatteryTruth API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.environ.get("BT_ALLOWED_ORIGINS", "*").split(",")],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# ---------------------------------------------------------------- health check
class EvidenceError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def features(a: np.ndarray, budget: float) -> np.ndarray:
    a = a[a[:, 0] <= budget]
    if len(a) < 10 or not np.isfinite(a).all():
        raise EvidenceError("too_short", "Insufficient or nonfinite observations")
    t, v, i = a[:, 0], a[:, 1], a[:, 2]
    if t[0] != 0 or np.any(np.diff(t) <= 0):
        raise EvidenceError("time_axis", "Expected monotone elapsed seconds starting at zero")
    if np.max(np.diff(t)) > 10:
        raise EvidenceError("gap", "Sampling gap exceeds 10 seconds")
    if np.any((v < 2) | (v > 3.8)) or np.any((i < 0) | (i > 10)):
        raise EvidenceError("envelope", "Outside supported signal envelope")
    if budget - t[-1] > 2:
        raise EvidenceError("too_short", "Prefix does not reach requested budget")
    tail = t >= t[-1] * 0.8
    return np.r_[np.interp(np.linspace(0, t[-1], 8), t, v), v[-1] - v[0], np.polyfit(t[tail], v[tail], 1)[0]]


def assess_budget(a: np.ndarray, k: int) -> dict:
    b = MODEL["budgets"][k]
    x = features(a, b["budget_s"])
    pred = b["intercept"] + float(np.sum(np.array(b["coef"]) * (x - np.array(b["scaler_mean"])) / np.array(b["scaler_scale"])))
    half = MODEL["halfwidth_Ah"][k]
    tx = np.array(b["train_X"])
    mu, sd = tx.mean(axis=0), tx.std(axis=0)
    sd[sd == 0] = 1
    z, zx = (tx - mu) / sd, (x - mu) / sd
    d = np.linalg.norm(z[:, None] - z[None], axis=2)
    np.fill_diagonal(d, np.inf)
    threshold = 1.5 * np.max(np.min(d, axis=1))
    dist = np.linalg.norm(z - zx, axis=1)
    near = np.argsort(dist, kind="stable")[:5]
    err = np.array(MODEL["train_errors_Ah"])
    gain = float(np.mean(err[near, k] - err[near, min(k + 1, 5)]))
    supported = bool(dist.min() <= threshold)
    return dict(budget_s=b["budget_s"], point=pred, half=half, lo=pred - half, hi=pred + half,
                supported=supported, gain=gain, enough=bool(supported and half <= MAX_HALFWIDTH_AH))


def run_session(rows: list) -> dict:
    a = np.asarray(rows, float)
    if a.ndim != 2 or a.shape[1] < 3 or len(a) == 0:
        return dict(decision="incompatible", reason="format", checkpoints=[], duration_s=0)
    a = a[:, :3]
    duration = float(a[-1, 0])
    cps = []
    for k, b in enumerate(MODEL["budgets"]):
        if b["budget_s"] - duration > 2:
            break
        try:
            cps.append(assess_budget(a, k))
        except EvidenceError as e:
            return dict(decision="incompatible", reason=e.code, checkpoints=cps, duration_s=duration)
    if not cps:
        return dict(decision="not_enough_data", reason="too_short", checkpoints=cps, duration_s=duration)
    first = next((c for c in cps if c["enough"]), None)
    if first:
        return dict(decision="report", at=first, checkpoints=cps, duration_s=duration)
    reason = "outside_support" if any(not c["supported"] for c in cps) else "too_wide"
    return dict(decision="not_assessable", reason=reason, checkpoints=cps, duration_s=duration)


class HealthRequest(BaseModel):
    observations: list[list[float]] = Field(..., max_length=20000)


@app.post("/api/health-check")
def health_check(req: HealthRequest):
    return run_session(req.observations)


# ---------------------------------------------------------------- AI coach
_client = None


def ai_available() -> bool:
    if AI_PROVIDER == "compat":
        return bool(AI_MODEL)
    return anthropic is not None and bool(os.environ.get("ANTHROPIC_API_KEY"))


def call_anthropic(system: str, messages: list, json_schema: dict | None) -> str:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    output_config = {"effort": "low"}
    if json_schema:
        output_config["format"] = {"type": "json_schema", "schema": json_schema}
    try:
        resp = _client.beta.messages.create(
            model=AI_MODEL,
            max_tokens=8000,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            system=system,
            output_config=output_config,
            messages=messages,
        )
    except anthropic.AuthenticationError:
        raise HTTPException(502, detail="The server's AI key is invalid.")
    except anthropic.RateLimitError:
        raise HTTPException(429, detail="The AI is busy, try again shortly.")
    except anthropic.BadRequestError as e:
        raise HTTPException(400, detail=e.message)
    except anthropic.APIStatusError as e:
        raise HTTPException(502, detail=f"AI service error {e.status_code}.")
    except anthropic.APIConnectionError:
        raise HTTPException(502, detail="Cannot reach the AI service.")
    if resp.stop_reason == "refusal":
        raise HTTPException(422, detail="The request was declined.")
    return "".join(b.text for b in resp.content if b.type == "text").strip()


def call_compat(system: str, messages: list, want_json: bool) -> str:
    headers = {"Content-Type": "application/json"}
    if COMPAT_KEY:
        headers["Authorization"] = "Bearer " + COMPAT_KEY

    def send(json_mode: bool) -> httpx.Response:
        body = {"model": AI_MODEL, "messages": [{"role": "system", "content": system}, *messages]}
        if json_mode:
            body["response_format"] = {"type": "json_object"}
        try:
            return httpx.post(COMPAT_BASE + "/chat/completions", headers=headers, json=body, timeout=120)
        except httpx.HTTPError:
            raise HTTPException(502, detail="Cannot reach the AI service.")

    r = send(want_json)
    if want_json and r.status_code == 400:  # provider without JSON mode
        r = send(False)
    if r.status_code in (401, 403):
        raise HTTPException(502, detail="The server's AI key is invalid.")
    if r.status_code == 429:
        raise HTTPException(429, detail="The AI is busy, try again shortly.")
    if r.status_code >= 400:
        raise HTTPException(502, detail=f"AI service error {r.status_code}.")
    try:
        return r.json()["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError, ValueError):
        raise HTTPException(502, detail="Unexpected AI response.")


def call_ai(system: str, messages: list, json_schema: dict | None = None) -> str:
    if not ai_available():
        raise HTTPException(503, detail="AI is not configured on this server.")
    if AI_PROVIDER == "compat":
        return call_compat(system + (PROMPT["json_instruction"] if json_schema else ""), messages, bool(json_schema))
    return call_anthropic(system, messages, json_schema)


def parse_json(text: str) -> dict:
    t = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        a, b = t.find("{"), t.rfind("}")
        if a >= 0 and b > a:
            try:
                return json.loads(t[a:b + 1])
            except json.JSONDecodeError:
                pass
    raise HTTPException(502, detail="Unexpected AI response.")


class AdviseRequest(BaseModel):
    context: dict


class ChatTurn(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(max_length=4000)


class ChatRequest(BaseModel):
    context: dict
    history: list[ChatTurn] = Field(..., min_length=1, max_length=30)


@app.post("/api/coach/advise")
def coach_advise(req: AdviseRequest):
    text = call_ai(PROMPT["system"], [{"role": "user", "content": "Context:\n" + json.dumps(req.context)}], PROMPT["advice_schema"])
    return parse_json(text)


@app.post("/api/coach/chat")
def coach_chat(req: ChatRequest):
    if req.history[-1].role != "user":
        raise HTTPException(400, detail="The last turn must be from the user.")
    messages = [
        {"role": "user", "content": "Context:\n" + json.dumps(req.context)},
        {"role": "assistant", "content": "Got it. What would you like to know?"},
        *[t.model_dump() for t in req.history],
    ]
    reply = call_ai(PROMPT["system"] + PROMPT["chat_suffix"], messages)
    return {"reply": reply}


# ---------------------------------------------------------------- status + static site
@app.get("/api/status")
def status():
    return {
        "service": "batterytruth-api",
        "version": app.version,
        "model_available": True,
        "model_version": MODEL["version"],
        "ai_available": ai_available(),
        "ai_provider": "anthropic" if AI_PROVIDER == "anthropic" else COMPAT_BASE,
        "ai_model": AI_MODEL,
    }


@app.exception_handler(HTTPException)
async def http_error(_, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.get("/")
def root():
    return RedirectResponse("/index.html")


app.mount("/", StaticFiles(directory=ROOT, html=True), name="site")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=os.environ.get("BT_HOST", "127.0.0.1"), port=int(os.environ.get("BT_PORT", "8787")))
