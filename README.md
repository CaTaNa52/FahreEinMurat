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
| Gas / vorwärts | W oder ↑ | Nur GAS (halten) |
| Rückwärts | S oder ↓ | BREMSE halten: zuerst anhalten, dann langsam rückwärts |
| Lenken | A / D oder ← / → | Zwei größere Links-/Rechts-Pfeile |
| Bremsen | Shift (lang halten = rückwärts) | BREMSE (lang halten = rückwärts) |
| Wheelie kontrollieren | Leertaste gedrückt halten, zum Absenken loslassen oder Shift drücken | **GAS gedrückt halten und mit demselben Finger zu WHEELIE hochwischen**; zurück zu GAS senkt das Rad |
| Zurücksetzen | R | ↺ (Desktop) |
| Kamera wechseln | V | 👁️ 1ST / 3RD |
| Garage/Zuhause öffnen | E in der Nähe des Gebäudes | Bildschirm-Buttons oder Nähe-Button |

Die mobile rechte Steuerfläche ist eine **Ein-Finger-Gestensteuerung**: Finger auf **GAS** halten, nach **WHEELIE** hochziehen (Gas bleibt gedrückt), wieder zurück zu **GAS** ziehen (Wheelie lösen) oder zu **BREMSE** ziehen (Gas loslassen und bremsen; weiter halten = rückwärts fahren). Die linke Steuerung besitzt nur noch zwei große Lenktasten. Die Bremse hat immer Vorrang vor Gas. Erst wenn der Finger vom Bildschirm abgehoben wird, werden die Eingaben dieser Geste beendet. Gleichzeitiges Lenken mit einem zweiten Finger und separate Wheelie-/Bremsberührungen bleiben möglich. Pointer-Capture verhindert abgebrochene Wischgesten; Mehrfach-Touch und Tastatureingaben werden unabhängig zusammengeführt.

## Spielwelt

- 1,2 × 1,2 km offene 3D-Welt mit kurviger Straße, Markierungen und Bäumen
- Instanced Trees: 600 auf Mobilgeräten, 1300 auf Desktop
- E-Scooter mit Lenker, Rädern, Beleuchtung und Fahrer
- Third-Person-Folgekamera, Bremsen, Rückwärtsfahren, Baumberührung und Wheelie
- Mobile Renderauflösung auf 1,4–1,9 DPR erhöht, WebGL-Kantenglättung aktiviert, besser lesbare HUD-Schriften; Schatten auf Mobilgeräten weiterhin deaktiviert

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

## Straßen, Häuser, Ampeln und Sitzbänke

- Vier befahrbare, breit ausgebaute Seitenstraßen/Kreuzungen verbinden sich mit der Hauptstraße. Zusätzlich stehen **16 Wohn- und Geschäftsgebäude entlang der Nebenstraßen**, mit weiteren Laternen und Sitzbänken an den Querverbindungen. Ampeln wechseln ihre Lichtphasen; die Gebäude außerhalb von Garage und Zuhause sind reine Kulisse.
- Das Zuhause besitzt jetzt ein korrekt zur Hauptstraße ausgerichtetes Satteldach, einen markierten Eingang, überdachte Veranda, Fensterrahmen, Kamin, Pflanzbeete und Stufen. Die Garage erhält eine sichtbare Torfassade; weitere zufahrtnahe Wohnhäuser, Cafés und kleine Läden bilden Straßenzüge. Fremde Gebäude sind reine Kulisse **ohne Zutrittsmöglichkeit**.
- **Gebäudekollisionen:** Scooter kann nicht mehr durch Häuser fahren – auch nicht mit hoher Geschwindigkeit. Die Grundrisse der zur Straße gedrehten Häuser sind in der Kollisionsberechnung angepasst. Eine kreisförmige Spieler-Kollisionshülle gleitet an rechteckigen Gebäudegrundrissen, Bänken und Laternen vorbei; Bewegung wird in kleine Schritte unterteilt, damit man mit Tempo nicht durch Wände tunnelt.
- **Sitzbänke:** Fahr zur Bank, bremse ab und drücke **E** oder am Smartphone **HINSETZEN**. Die Spielfigur sitzt dann auf der Bank. **E/AUFSTEHEN** setzt die Fahrt fort. Sitzbänke sind ebenfalls Hindernisse.
- **Unterbodenbeleuchtung:** In der Garage Neon aktivieren und Farbe wählen. LED-Leisten sitzen am Deck; ein weicher, auslaufender Halo erscheint auf der Straße. Eine **nach unten gerichtete Spotlichtquelle** beleuchtet nur Boden und niedrige Gegenstände unter dem Scooter. Die bisherige omnidirektionale Punktbeleuchtung (die auch den Fahrer und Oberseiten bestrahlte) wurde entfernt. 
- Die Darstellung ist für Desktop und mobile Browser ausgelegt. Straßenlaternen nutzen auf mobilen Geräten überwiegend selbstleuchtende Materialien statt vieler teurer dynamischer Lichtquellen.

## Garage, Zuhause und Ich-Perspektive

- **MURAT GARAGE:** Gebäude bei z = +74. 3D-Scooter per Finger/Maus drehen; Modelle City/Sport/Classic, Fahrzeug-, Akzent- und Lichtfarbe, Straßen-/Offroadreifen, Neon-Unterbodenbeleuchtung und Gepäckbox. Einige Extras kosten Murat-Coins, Farben sind kostenlos.
- **ZUHAUSE:** Gebäude bei z = +158. Drehbarer 3D-Charakter mit Helm an/aus und Helmfarbe, Jacken-/Hosenfarbe, Armbanduhr an/aus und Uhrenfarbe.
- **Zugriff:** in der Nähe des Gebäudes E drücken oder im HUD Garage/Zuhause anwählen. Der Scooter bleibt während des Konfigurierens stehen. Änderungen sind sofort an der Spielfigur und am Scooter sichtbar.
- **Kameramodus:** V auf Tastatur oder Schaltfläche **👁️ 1ST / 3RD** auf Touchscreen. Wechselt zwischen First-Person und Verfolgerkamera.
- Coins, freigeschaltete Extras und Farben werden lokal im Browser gespeichert (kein Login, Backend oder Supabase).
- Die Scooterphysik ist ein anpassbares Arcade-Physikmodell, kein vollständiger Rigid-Body-Simulator.

## Als PWA installieren (Android, iPhone und Desktop)

Die Spielwelt ist als **Progressive Web App** installierbar. Ein Manifest, App-Icons (192/512 px, Apple Touch Icon und maskierbares Android-Icon), `display: standalone`, Viewport-Safe-Areas und ein eigener Service Worker gehören dazu. Nach dem ersten vollständigen Laden werden die gebauten JavaScript-/CSS-Dateien inklusive aller Lazy-Chunks in einem versionsabhängigen Offline-Cache gespeichert. Das Spiel kann anschließend auch ohne Internet gestartet werden, sofern der Browser die Offline-Speicherung erlaubt.

**Wichtig: Automatische Installation beim bloßen Öffnen eines Links ist nicht erlaubt.** Browser/OS verlangen immer eine aktive Zustimmung. Darum wird beim ersten Aufruf sofort ein Installationsangebot eingeblendet. **Android/Chrome:** „APP HINZUFÜGEN“ und native Installation bestätigen; erscheint noch kein nativer Dialog, Browsermenü „App installieren“ wählen. **iPhone/Safari:** Teilen → „Zum Home-Bildschirm“ → „Hinzufügen“. Der Hinweis ist überspringbar und kann über **⬇ APP** erneut geöffnet werden. Beim Spielen verschwindet das offene Popup, damit es Gas/Bremse nicht blockiert.

Nach der Installation öffnet sich die App ohne normale Browser-Adressleiste und behält ihre bisherigen lokalen Daten (wenn unter demselben Browser-/Origin-Speicher). Textmarkierung, Bildziehen, langes iOS-Callout und Overscroll sind in der Spielansicht unterdrückt; Menüs und Konfiguratoren bleiben scrollbar, Tastaturfokus bleibt erhalten.

**Entwicklung in Codespaces:** PWA-Service-Worker braucht HTTPS oder localhost. Die Codespaces-Port-URL muss direkt im Browser geöffnet werden. Der Vite-Devmodus unterstützt die Web-App-Funktionen, die vollständige gebündelte Offline-Version entsteht beim `npm run build` und kann mit `npm run preview` geprüft werden. Für eine öffentlich installierbare URL später über HTTPS (z. B. Vercel) deployen.

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
  InstallPrompt.jsx Browser-Installationsdialog / iOS-Hilfe
  pwa.js            Service-Worker-Registrierung und Plattformerkennung
  Underglow.jsx     Dynamische Neon-Beleuchtung
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
