# FAHRE EIN MURAT 🛴

Ein browserbasiertes 3D-E-Scooter-Freeride-Spiel mit Third- und First-Person-Kamera, bewaldeter Welt, Fahrphysik, drei Challenges, Garage und Zuhause. Auf PC und Smartphone nutzbar.

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
| Wheelie kontrollieren | Leertaste gedrückt halten, zum Absenken loslassen oder Shift drücken | **GAS gedrückt halten und mit demselben Finger zu WHEELIE hochwischen**; zurück zu GAS senkt das Rad |
| Zurücksetzen | R | ↺ (Desktop) |
| Kamera wechseln | V | 👁️ 1ST / 3RD |
| Garage/Zuhause öffnen | E in der Nähe des Gebäudes | Bildschirm-Buttons oder Nähe-Button |

Die mobile rechte Steuerfläche ist eine **Ein-Finger-Gestensteuerung**: Finger auf **GAS** halten, nach **WHEELIE** hochziehen (Gas bleibt gedrückt), wieder zurück zu **GAS** ziehen (Wheelie lösen) oder mit dem Finger zu **BREMSE** ziehen (Gas loslassen und bremsen). Erst wenn der Finger vom Bildschirm abgehoben wird, werden die Eingaben dieser Geste beendet. Gleichzeitiges Lenken mit einem zweiten Finger und separate Wheelie-/Bremsberührungen bleiben möglich. Pointer-Capture verhindert abgebrochene Wischgesten; Mehrfach-Touch und Tastatureingaben werden unabhängig zusammengeführt.

## Spielwelt

- 1,2 × 1,2 km offene 3D-Welt mit kurviger Straße, Markierungen und Bäumen
- Instanced Trees: 600 auf Mobilgeräten, 1300 auf Desktop
- E-Scooter mit Lenker, Rädern, Beleuchtung und Fahrer
- Third-Person-Folgekamera, Bremsen, Rückwärtsfahren, Baumberührung und Wheelie
- Mobile Renderauflösung begrenzt, Schatten auf Mobilgeräten deaktiviert

## Challenges und Coins

- **SLALOM-SPRINT** (grüne Startzone bei z = -24): sieben orange-weiße Leitkegel, abwechselnd rechts/links, Ziellinie, 40 Sekunden. **1.000 Coins**.
- **WHEELIE-BALANCE** (blaue Startzone bei z = -240): vier Sekunden durchgehende Balance innerhalb von 35 Sekunden. **1.000 Coins**.
- **GOLDENE SCHLÜSSELSUCHE** (goldene Startzone bei z = -445): finde einen versteckten goldenen Schlüssel in 120 Sekunden. Der Schlüssel erscheint bei **jedem Start an einem anderen von zwölf Plätzen**, ohne Marker, Kompass, Entfernungsangabe oder Richtungspfeil. **1.250 Coins**.
- **Unbegrenzt wiederholbar und belohnt:** jede erfolgreich abgeschlossene Challenge zahlt ihre Coins erneut aus. Für einen Neustart die leuchtende Startzone verlassen und wieder betreten.
- Startfelder sind räumlich getrennt (jeweils mindestens 150 m Abstand) und liegen an der Straße. Die Suche ist eine echte Suche: das Objekt wird erst im näheren Sichtbereich als 3D-Schlüssel sichtbar.

## Erste Schritte: überspringbare Einführung

Beim **ersten** Klick auf „JETZT FAHREN“ öffnet sich ein kurzes, vierstufiges 3D-Tutorial:
1. Kamera zeigt auf **Zuhause**, wo Helm, Kleidung und Uhr angepasst werden.
2. Kamera zeigt auf die **Murat-Garage**, wo Scooter-Modelle, Farben und Extras verändert werden.
3. Kamera zeigt die **Challenge-Zone**; leuchtende Felder starten Slalom, Wheelie und die versteckte Schlüsselsuche ohne Navigationshilfen.
4. **Bedienung** auf Handy und PC sowie Umschalten der First-Person-Kamera.

Die Steuerung ist währenddessen pausiert. **ÜBERSPRINGEN** beendet das Tutorial sofort, **WEITER** geht zur nächsten Station und **LOSFAHREN** startet das Spiel. Es erscheint nach dem Abschluss oder Überspringen nicht mehr automatisch und lässt sich jederzeit über **❔ HILFE** erneut starten. Dies wird unter `fahre-ein-murat-tutorial-seen-v1` lokal gespeichert.

## Tests / CI-Schutz

GitHub Actions startet bei jedem PR auf `main` und jedem Push auf `main`: **Unit-Tests, Produktions-Build, Chromium-E2E auf Desktop und Mobile**. Die Browser-Tests prüfen auch den direkten Zugang zu Zuhause mit defekten/alten Profildaten, Helm an/aus, eine Uhr kaufen, den 3D-Viewer, Wechsel von Garage zu Zuhause, erneutes Laden der Einstellungen, das durchgehende erste Tutorial und das Überspringen. Bei Fehlern sind Playwright-Screenshots und Traces als Actions-Artefakte verfügbar. Bitte **PRs erst nach grüner Pipeline mergen**.

## Garage, Zuhause und Ich-Perspektive

- **MURAT GARAGE:** Gebäude bei z = +74. 3D-Scooter per Finger/Maus drehen; Modelle City/Sport/Classic, Fahrzeug-, Akzent- und Lichtfarbe, Straßen-/Offroadreifen, Neon-Unterbodenbeleuchtung und Gepäckbox. Einige Extras kosten Murat-Coins, Farben sind kostenlos.
- **ZUHAUSE:** Gebäude bei z = +158. Drehbarer 3D-Charakter mit Helm an/aus und Helmfarbe, Jacken-/Hosenfarbe, Armbanduhr an/aus und Uhrenfarbe.
- **Zugriff:** in der Nähe des Gebäudes E drücken oder im HUD Garage/Zuhause anwählen. Der Scooter bleibt während des Konfigurierens stehen. Änderungen sind sofort an der Spielfigur und am Scooter sichtbar.
- **Kameramodus:** V auf Tastatur oder Schaltfläche **👁️ 1ST / 3RD** auf Touchscreen. Wechselt zwischen First-Person und Verfolgerkamera.
- Coins, freigeschaltete Extras und Farben werden lokal im Browser gespeichert (kein Login, Backend oder Supabase).
- Die Scooterphysik ist ein anpassbares Arcade-Physikmodell, kein vollständiger Rigid-Body-Simulator.

## Testen

```bash
npm run test:unit
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
  World.jsx         3D-Welt, Gebäude, Suche, Fahrsimulation
  Models.jsx        Scooter- und Fahrermodell samt Kosmetik
  Customizer.jsx    3D-Konfigurator mit drehbarer Vorschau
  gameplay.js       Challenge-Regeln und zufällige Such-Spawns
  customization.js  Shop-Preise, Profile und LocalStorage
  style.css         Responsive Layout
tests/e2e/           Chromium-Browser-Smoketests
.github/workflows/   Build- und Browser-Tests
.devcontainer/       Codespaces-Konfiguration
```

## Später

PWA-Manifest, App-Icons, Service Worker und Offline-Unterstützung; danach optional Vercel, Supabase und Multiplayer. Die aktuelle Version ist ein Prototyp ohne fertige realistische PBR-Texturen.
