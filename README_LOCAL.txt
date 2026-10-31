BatteryTruth demo - how to open
================================

1) Pitch only: double-click index.html (works offline). The app needs a local server (step 2).

2) Local server:
   - double-click start_demo.bat
     (or open a terminal in this folder and run:  python -m http.server 8080 --bind 127.0.0.1)
   - open http://localhost:8080 (pitch) or http://localhost:8080/app/ (app)

   Full stack with the AI Coach on the server: set ANTHROPIC_API_KEY, then double-click api\start_api.bat
   (opens http://127.0.0.1:8787/app/).

3) Stop the local server: press Ctrl+C in the server window, or close that window.

The pitch and the battery check make no network calls and have no analytics. The AI Coach contacts the AI service only when you connect it.
A copy of this folder is also published, at the owner's request, as a GitHub Pages site.
