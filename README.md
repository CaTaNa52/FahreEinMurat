# FAHRE EIN MURAT 🛴

Browserbasiertes 3D-E-Scooter-Spiel mit Third-Person-Kamera, großer Waldwelt und Wheelie-Modus.

## Stack (aktuell)

- **React 19** – UI und Bedienelemente
- **Vite 7** – lokaler Entwicklungsserver und Build
- **Three.js** – WebGL-Rendering und 3D-Welt
- **Kein Backend, keine Datenbank, keine Anmeldung und keine Hosting-Integration** in dieser Phase

## Lokal spielen

Voraussetzung: Node.js 20.19+ oder 22.12+ und npm.

```bash
npm install
npm run dev
```

Anschließend die im Terminal angegebene lokale URL öffnen (standardmäßig http://localhost:5173).

Produktionsbuild:

```bash
npm run build
npm run preview
```

## Steuerung

| Funktion | Tastatur | Touch |
| --- | --- | --- |
| Beschleunigen | W / Pfeil hoch | GAS / ↑ |
| Rückwärts | S / Pfeil runter | ↓ |
| Lenken | A / D oder Pfeiltasten | ← / → |
| Bremsen | Shift | BREMSE |
| Wheelie | Leertaste halten | WHEELIE ↑ einschalten / RAD RUNTER ↓ ausschalten |
| Reset | R | ↺, bei großen Displays |

## Inhalt

- Detaillierter, geometrisch modellierter Scooter
- Smooth Third-Person-Kamera
- 2,2 × 2,2 km Waldkarte mit 1.750 instanzierten Bäumen
- Straßen, Fahrphysik, Baumkollisionen und Wheelie
- Responsive Touch-Bedienung
- Begrenzte Pixeldichte und räumliches Raster für Baumkollisionen

## Projektstruktur

```text
index.html
package.json
vite.config.js
src/
  main.jsx      React Einstieg
  App.jsx       Benutzeroberfläche / Touch-Controls
  style.css     Styles
  game.js       Three.js-Welt, Animation, Fahrlogik
```

## Zukunft

Backend, Supabase und Vercel können später ergänzt werden. Derzeit sind **keine** Umgebungsvariablen oder Cloud-Dienste erforderlich.

Der Stand ist ein Prototyp: auf realen Geräten noch auf FPS und Verhalten zu testen. Hochwertige externe PBR-Assets und Texturen sind als separater visueller Ausbauschritt vorgesehen.
