# FAHRE EIN MURAT 🛴

Ein direkt im Browser spielbarer 3D-E-Scooter-Freeride-Prototyp mit Third-Person-Kamera, Wald-Open-World, Wheelies und Touch-Steuerung.

## Spielen

Öffne `index.html` über einen lokalen Webserver oder veröffentliche das Repository auf Vercel. Die 3D-Bibliothek Three.js wird als ES-Modul von jsDelivr geladen; beim ersten Besuch ist deshalb Internet erforderlich.

### Steuerung

| Funktion | Tastatur | Touch |
| --- | --- | --- |
| Gas / vorwärts | W oder ↑ | GAS oder ↑ |
| Rückwärts | S oder ↓ | ↓ |
| Lenken | A/D oder ←/→ | ← / → |
| Bremsen | Shift | BREMSE |
| Wheelie / Vorderrad runter | Leertaste halten / loslassen | WHEELIE ↑ / RAD RUNTER ↓ |
| Zurücksetzen | R | ↺ (Desktop) |

Hinweis: Wheelies funktionieren in Bewegung. Der Touch-Button schaltet den Wheelie-Modus um; die Tastatur hält ihn nur während des Tastendrucks.

## Features

- Three.js / WebGL mit Third-Person-Folgekamera und sanfter Kamerabewegung
- Procedural 3D-Scooter mit Rädern, Lenker, Trittbrett und Licht
- 2,2 × 2,2 km große Landschaft mit zwei Straßen, Bodenvariationen und **1.750 Bäumen**
- GPU-Instancing für Bäume und räumliches Raster für effiziente Kollisionen
- Fahrphysik mit Beschleunigung, Rückwärtsgang, Reibung, Lenkung, Bremse und Wheelie
- Mobile Bildschirmbuttons, Desktop-Steuerung, Geschwindigkeitsanzeige
- Render-Pixelratio-Begrenzung sowie Distanznebel zur Performance-Unterstützung

## Lokal starten

Mit Python 3:

```bash
python3 -m http.server 8080
```

Danach `http://localhost:8080` öffnen.

## Deployment auf Vercel

1. In Vercel **Add New → Project** wählen.
2. Das GitHub-Repository `CaTaNa52/FahreEinMurat` importieren.
3. Framework Preset: **Other**.
4. Keine Build-Anweisung, Output-Verzeichnis: `.` (Root des Repositories).
5. Deploy ausführen.

Alternativ funktioniert jeder statische Webserver.

## Stand & nächste Ausbaustufen

Dies ist ein erster spielbarer Prototyp, kein fertiger Fahrsimulator. Scooter und Gelände verwenden prozedurale Materialien und Geometrien statt externer Fototexturen oder hochauflösender 3D-Assets. Fahrverhalten und FPS müssen noch auf echten Zielgeräten geprüft werden. Weitere sinnvolle Schritte: glTF-Scootermodell mit PBR-Texturen, gekacheltes Terrain, Sichtweiten-/LOD-System, Hindernisse, Tricks und Sound.
