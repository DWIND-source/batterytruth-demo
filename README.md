# BatteryTruth

**Know your battery. No special tools.** BatteryTruth reads ordinary EV charging data, tells you how healthy the battery is with an honest range, and its AI Coach shows you how to charge so the battery lasts.

| Part | Path | What it is |
|---|---|---|
| Pitch | [`index.html`](index.html) | ~95-second auto-playing story (15 scenes) + an interactive view, English / Tiếng Việt, light / dark |
| App | [`app/`](app/) | The product for drivers: Smart charging (AI Coach), Battery check, Charging log, Ask AI |

The pitch's **▶ Live app** button opens the app.

## The app

- **Smart charging** — enter the temperature (or tap **📍 Local weather**), current charge, departure time, trip and chargers, or pick a scenario such as *36°C, leaving in 1 hour*. BatteryTruth picks AC or DC, the target %, when to start, and shows a battery-stress score with what drives it. The **AI Coach** turns the plan into personal advice.
- **Battery check** — choose a charging session or upload a log (`elapsed_s, voltage_V, current_A`, one row per second or faster). The model estimates capacity checkpoint by checkpoint (5–40 min) and reports only when the range is within ±0.5 Ah and the data match what it has learned. It runs in the browser; the result is identical to the Python model.
- **Charging log** — record charges by hand, or let a connected car or OBD adapter send them with the user's connection code.
- **Ask AI** — follow-up chat that knows your scenario and latest battery check.

### AI and data

The AI Coach runs on the BatteryTruth server with the model the operator chooses. Users never enter an API key. On first use, the app asks which data the user agrees to share: location, charging & vehicle data, and app usage & AI questions. Users can change these choices or delete all their data at any time under **Account**. Without a server connection, the battery check and the rule-based charging plan still work.

The app finds its server through [`app/config.js`](app/config.js): `apiBase: ""` means the same address as the page (the server hosts the app). For a static copy, such as this GitHub Pages site, set it to the server's public https address.

## Run locally

```bat
start_demo.bat     :: static copy on http://localhost:8080 (pitch + app; AI needs the server)
```

The app uses ES modules and `fetch`, so open it through a local server rather than by double-clicking the file.

## Numbers and sources

- Battery-check accuracy: 23 second-life LFP cells and 21 NMC cells, each cell tested while held out of training.
- Sample sessions: Ji, Yue, Shao & Zhu (2026), *Second-life LFP battery dataset v2*, Zenodo, doi:10.5281/zenodo.18630889, CC BY 4.0.
- IEA, *Global EV Outlook 2025*: more than 17 million electric cars sold worldwide in 2024; almost 58 million on the road at the end of 2024.
- AA & Electrifying.com survey of 13,000+ UK drivers (published 25 Aug 2026): 3% feel confident buying a used EV; 38% say an independently verified battery-health certificate would increase their confidence.
- Regulation (EU) 2023/1542: the battery passport becomes mandatory for EV batteries from 18 February 2027, including state-of-health data.
- Charging advice follows general battery-care principles; the car maker's instructions always come first. Local weather: [Open-Meteo](https://open-meteo.com).

Photo credits: [CREDITS.md](CREDITS.md).
