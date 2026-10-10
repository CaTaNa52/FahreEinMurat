# FAHRE EIN MURAT 🛴

Ein browserbasiertes 3D-E-Scooter-Freeride-Spiel mit Third-Person-Kamera, bewaldeter Welt, Fahrphysik und Wheelies. Auf PC und Smartphone nutzbar.

## Architektur – wie ONEVERSE

- React 19 für Startbildschirm, Fahr-HUD und Touch-Bedienung
- Vite 6 und das offizielle React-Plugin als Entwicklungsserver
- **React Three Fiber 9** und Three.js für die 3D-Szene
- React-Szene wird erst nach Klick auf **JETZT FAHREN** geladen
- Fehlergrenze und WebGL-Check statt leerer Seite bei fehlgeschlagener Initialisierung
- **Kein Backend, kein Supabase, keine Authentifizierung, kein Hosting** benötigt

## Start in GitHub Codespaces

1. Öffne das Repository auf **main**.
2. In einem bestehenden Codespace zunächst `git pull origin main` ausführen.
3. Über die Befehlspalette **Codespaces: Rebuild Container** auswählen, damit die aktuelle `.devcontainer/devcontainer.json` übernommen wird.
4. Starte im Terminal **genau einen** Vite-Prozess:

```bash
npm install
npm run dev
```

5. Unter **Ports** Port **5173** mit **Open in Browser** öffnen. Die App funktioniert im externen Safari/Chrome zuverlässiger als in einer eingebetteten IDE-Vorschau.

Der Port ist mit `--strictPort` festgelegt. Ist 5173 belegt, wird ein Fehler angezeigt statt unbemerkt Port 5174 zu verwenden. Beende einen alten Vite-Prozess zuvor im entsprechenden Terminal mit **Strg+C**.

Bei einem grauen Bildschirm: Hard-Reload durchführen, Browser-Konsole prüfen und verifizieren, dass die URL tatsächlich zum aktuellen Port 5173 gehört. Im Codespace `git log -1 --oneline` zur Prüfung des verwendeten Quellstands.

## Steuerung

| Aktion | PC | Handy |
|---|---|---|
| Gas / vorwärts | W oder ↑ | GAS oder ↑ |
| Rückwärts | S oder ↓ | ↓ |
| Lenken | A / D oder ← / → | ← / → |
| Bremsen | Shift | BREMSE |
| Wheelie | Leertaste halten | WHEELIE ↑ / RAD RUNTER ↓ |
| Zurücksetzen | R | ↺ (Desktop) |

Die Touch-Schaltflächen unterstützen gedrückt halten und gleichzeitig Lenken.

## Spielwelt

- 1,2 × 1,2 km offene 3D-Welt mit kurviger Straße, Markierungen und Bäumen
- Instanced Trees: 600 auf Mobilgeräten, 1300 auf Desktop
- E-Scooter mit Lenker, Rädern, Beleuchtung und Fahrer
- Third-Person-Folgekamera, Bremsen, Rückwärtsfahren, Baumberührung und Wheelie
- Mobile Renderauflösung begrenzt, Schatten auf Mobilgeräten deaktiviert

## Testen

```bash
npm run build
npx playwright install chromium
npm run test:e2e
```

GitHub Actions führt Build und Chromium-Smoke-Tests für Desktop und mobiles Viewport aus. Die Tests prüfen, ob der Startbildschirm angezeigt wird, eine Canvas-Szene erscheint und sich die Geschwindigkeit beim Gasgeben verändert. Das Bestehen der Tests und das Verhalten auf echten Geräten müssen anhand der jeweiligen Resultate bestätigt werden.

## Projekt

```text
index.html
package.json
vite.config.js
src/
  main.jsx          React-Einstieg
  App.jsx           Startbildschirm, HUD, mobile Steuerung
  GameCanvas.jsx    React Three Fiber Canvas
  World.jsx         3D-Welt, Scooter, Fahrer, Fahrsimulation
  style.css         Responsive Layout
tests/e2e/           Chromium-Browser-Smoketests
.github/workflows/   Build- und Browser-Tests
.devcontainer/       Codespaces-Konfiguration
```

## Später

PWA-Manifest, App-Icons, Service Worker und Offline-Unterstützung; danach optional Vercel, Supabase und Multiplayer. Die aktuelle Version ist ein Prototyp ohne fertige realistische PBR-Texturen.
