# BatteryTruth — interactive demo

**Battery health you can check.** A short, ordinary charging session → an honest capacity range → a report *only* when the evidence is strong enough.

This is a single-file, offline presentation demo (HTML + CSS + SVG + JavaScript, no libraries, no external requests, no tracking) for a research prototype.

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

All performance figures come from laboratory experiments on public battery-cell datasets (23 second-life LFP cells and 21 NMC cells, each cell tested while held out of training). They are **not** EV-pack validation, certified state-of-health percentages, or safety ratings. Ranges and sessions in the animated decision views are illustrations of the decision flow. Market segments and the business model are proposals, not deployments.
