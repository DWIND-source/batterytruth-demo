# BatteryTruth — interactive pitch demo

**Know your battery. No special tools.** Software that watches ordinary EV charging and tells you how healthy the battery is — with an honest range, and a clear "not enough evidence yet" when it can't tell. Next on the roadmap: charging advice that helps the battery last, and a fair battery value for resale.

A ~95-second auto-playing story (15 scenes) plus an interactive "Try it" view, in English and Vietnamese, with light and dark themes. Plain HTML + CSS + SVG + JavaScript: no libraries, no external requests, no tracking. Works offline.

## Open it

- Online: the GitHub Pages link of this repository.
- Offline: double-click `index.html`, or run `python -m http.server 8080` in this folder and open <http://localhost:8080>.

## Controls

| Key | Action |
|---|---|
| Space | play / pause the story |
| ← / → | previous / next scene |
| R | restart |
| F | fullscreen |
| M | manual lock (no auto-resume) |
| T | interactive "Try it" view |
| L | English / Tiếng Việt |
| D | light / dark theme |

When idle for 12 seconds, the story resumes automatically (kiosk mode) unless manual lock is on.

## What the numbers mean

- **Lab results** come from experiments on public battery-cell datasets (23 second-life LFP cells and 21 NMC cells, each cell tested while held out of training). They are **not** EV-pack validation, certified state-of-health percentages, lifetime forecasts or safety ratings.
- **Charging advice and battery valuation are concepts** shown on an illustrative screen; no experiments have been run on them yet.
- Ranges and sessions in the animated decision views illustrate the decision flow.
- Market segments and the business model are proposals, not deployments.

## External sources

- IEA, *Global EV Outlook 2025*: more than 17 million electric cars sold worldwide in 2024; almost 58 million on the road at the end of 2024.
- AA & Electrifying.com survey of 13,000+ UK drivers (published 25 Aug 2026): 3% feel confident buying a used EV; 38% say an independently verified battery-health certificate would increase their confidence.
- Regulation (EU) 2023/1542: the battery passport becomes mandatory for EV batteries from 18 February 2027, including state-of-health data.

Photo credits: see [CREDITS.md](CREDITS.md).
