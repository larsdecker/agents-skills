# Budget-Defaults und ihre Herkunft

Alle Werte stehen zusätzlich im Objekt `BUDGETS` am Anfang von `scripts/perf-scan.mjs`. Diese Datei erklärt die Herkunft und die Grenzen jedes Werts — nicht nur die Zahl.

## Ressourcen-Budgets (mobil, p75, content-lastige Seite)

| Budget | Standardwert | Herkunft |
| :-- | :-- | :-- |
| JavaScript gesamt | 200 KB | Übertragene (komprimierte) Bytes. Deckt sich mit dem verbreiteten Zielkorridor 170–200 KB für den initialen Ladevorgang. |
| CSS gesamt | 60 KB | Bei modernem Utility-CSS (Tailwind u. ä.) mit Purge deutlich unterschritten; ohne Purge häufig das erste Budget, das reißt. |
| Above-the-fold-Bilder | 300 KB | Näherungswert für die ersten sichtbaren Bilder. Gilt für **ein** Hero-Bild in modernem Format — nicht für eine Bildergalerie oberhalb der Falz. |
| Requests (initial) | 50 | Zählt nur, was im HTML referenziert ist (siehe Caveats in der SKILL.md). Reale Seiten mit viel Tracking/Consent liegen oft deutlich darüber, ohne dass jede Überschreitung ein Problem ist. |
| Drittanbieter-Origins | 2 | Absichtlich niedrig — jeder zusätzliche Origin ist ein zusätzlicher DNS-Lookup, oft ein zusätzlicher TLS-Handshake, und eine Abhängigkeit von fremder Verfügbarkeit. |

## Wann diese Werte NICHT gelten

Ein Werkzeug, das dieselbe Zahl auf jede Seite anwendet, produziert auf einem Teil der Seiten Falschbefunde. Bekannte Ausnahmen:

- **Bildlastige Seiten** (Portfolio, Produktkatalog): Das Bild-Budget ist zu eng. Setze projektspezifische Budgets über `--budget budgets.json` statt den Standardwert zu ignorieren.
- **Dashboards/Apps hinter Login**: Erster Ladevorgang ist weniger kritisch als Interaktivität nach dem Login. JS-Budget für die Route "nach dem Login" darf großzügiger sein als für die öffentliche Startseite.
- **Landingpages mit viel Marketing-Tracking**: Die Drittanbieter-Zahl liegt strukturell höher. Das ist eine Geschäftsentscheidung (welches Tracking ist den Marketing-Teams wichtig), keine technische — der Scan meldet die Zahl, entscheidet aber nicht, ob sie zu hoch ist.
- **Lokale Entwicklung ohne Kompression/CDN**: Bytegewicht ist im Dev-Modus oft deutlich höher als in Produktion (kein Minify, kein Brotli, keine Edge-Caches). Nie Dev-Zahlen gegen Produktions-Budgets prüfen.

## Warum keine LCP/INP/CLS/TBT-Schwellwerte in diesem Dokument stehen

Diese Datei enthält bewusst keine Tabelle mit "LCP ≤ 2.5 s" o. ä. — nicht weil diese Werte falsch wären, sondern weil dieser Skill sie nicht misst und eine Tabelle mit Werten, die er nicht prüfen kann, den Eindruck erweckt, er täte es. Die Zielwerte für echte Web-Vitals-Messungen gehören in die Lighthouse-CI-Konfiguration (`references/lighthouserc-template.md` im Skill `perf-budget-fix`) und werden dort mit Lighthouse oder Felddaten geprüft, nicht mit diesem Scan.

## CI-Budget-Gate

Der Scan sucht `lighthouserc.json`, `.lighthouserc.json`, `lighthouserc.js` oder `.lighthouserc.js` im aktuellen Arbeitsverzeichnis. Gefunden bedeutet nicht automatisch ausreichend: geprüft wird zusätzlich, ob die Datei mindestens drei der folgenden Textbausteine enthält — `largest-contentful-paint`, `cumulative-layout-shift`, `total-blocking-time`, `interactive`, `total-byte-weight`, `resource-summary`. Das ist eine reine Textsuche, kein Parsen der `assert`-Struktur — sie erkennt zuverlässig "keine Assertions vorhanden", nicht jede syntaktisch falsche Konfiguration.
