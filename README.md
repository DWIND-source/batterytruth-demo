# BatteryTruth

**Know your battery. No special tools.** BatteryTruth reads ordinary EV charging data, tells you how healthy the battery is with an honest range, and its AI Coach shows you how to charge so the battery lasts.

This repository has two parts:

| Part | Path | What it is |
|---|---|---|
| Pitch | [`index.html`](index.html) | ~95-second auto-playing story (15 scenes) + an interactive view, English / Tiếng Việt, light / dark |
| App | [`app/`](app/) | The working product demo: Smart charging (AI Coach), Battery check, Ask AI |
| API | [`api/`](api/) | FastAPI server: the same battery model, the AI Coach with a server-side key, and the website |

The pitch's **▶ Live app** button opens the app.

## The app

- **Smart charging** — enter the temperature, current charge, departure time, trip and chargers (or tap a scenario such as *36°C, leaving in 1 hour*). BatteryTruth picks AC or DC, the target %, when to start, and shows a battery-stress score with what drives it. **AI Coach** (Claude or any provider you connect) turns the plan into personal advice.
- **Battery check** — choose a charging session or upload a log (`elapsed_s, voltage_V, current_A`, one row per second or faster). The model estimates capacity checkpoint by checkpoint (5, 10, 15, 20, 30, 40 min) and reports only when the range is within ±0.5 Ah and the data match what it has learned. It runs entirely in the browser; the result is identical to the Python model.
- **Ask AI** — follow-up chat that knows your scenario and latest battery check.

### AI connection

Open the **AI** button in the app:

- **My own API key** — pick a provider and paste your key: Anthropic Claude (`claude-opus-5-5`), OpenAI, Google Gemini, OpenRouter (one key for hundreds of models), Groq, DeepSeek, Mistral, Ollama on your own computer, or any **OpenAI-compatible** address (LM Studio, vLLM, Together, Fireworks, Azure…). **Load model list** fetches the models your key can use. The key stays on the device and is sent only to that provider. If a provider blocks calls from browsers, use OpenRouter or the server below.
- **BatteryTruth server** — run `api/server.py`; the key stays on the server.
- **AI off** — the rule-based plan still works and nothing is sent anywhere.

Server configuration (environment variables):

```powershell
# Claude
$env:ANTHROPIC_API_KEY = "sk-ant-..."
# or any OpenAI-compatible provider
$env:BT_AI_BASE_URL = "https://api.openai.com/v1"   # e.g. https://generativelanguage.googleapis.com/v1beta/openai, https://openrouter.ai/api/v1, http://localhost:11434/v1
$env:BT_AI_MODEL    = "gpt-5.4-mini"
$env:BT_AI_KEY      = "sk-..."
```

## Run locally

```bat
start_demo.bat            :: static site on http://localhost:8080 (pitch + app, AI via your own key)
api\start_api.bat         :: full stack on http://127.0.0.1:8787/app/ (set the AI variables above first)
```

The app uses ES modules and `fetch`, so open it through one of these servers rather than by double-clicking the file.

### API

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/status` | — | service, model and AI availability |
| POST | `/api/health-check` | `{"observations": [[t_s, V, A], ...]}` | decision, checkpoints, capacity range |
| POST | `/api/coach/advise` | `{"context": {...}}` | `{headline, actions, why, watch_out}` |
| POST | `/api/coach/chat` | `{"context": {...}, "history": [...]}` | `{reply}` |

## Numbers and sources

- Battery-check accuracy: 23 second-life LFP cells and 21 NMC cells, each cell tested while held out of training.
- Sample sessions: Ji, Yue, Shao & Zhu (2026), *Second-life LFP battery dataset v2*, Zenodo, doi:10.5281/zenodo.18630889, CC BY 4.0.
- IEA, *Global EV Outlook 2025*: more than 17 million electric cars sold worldwide in 2024; almost 58 million on the road at the end of 2024.
- AA & Electrifying.com survey of 13,000+ UK drivers (published 25 Aug 2026): 3% feel confident buying a used EV; 38% say an independently verified battery-health certificate would increase their confidence.
- Regulation (EU) 2023/1542: the battery passport becomes mandatory for EV batteries from 18 February 2027, including state-of-health data.
- Charging advice follows general battery-care principles; the car maker's instructions always come first.

Photo credits: [CREDITS.md](CREDITS.md). Bundled Anthropic TypeScript SDK 1.3.0: MIT licence, [`app/vendor/LICENSE-anthropic-sdk.txt`](app/vendor/LICENSE-anthropic-sdk.txt).
