# lighthouserc.json — Vorlage

Anlegen ist mechanisch. Die konkreten Zahlen sind eine Team-Entscheidung — als Vorschlag markieren, nicht stillschweigend übernehmen. Sinnvolle Startwerte: der aktuelle `perf-budget-check`-Scan plus etwas Puffer, oder die "guten" Richtwerte unten, wenn noch keine Baseline existiert.

```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "settings": {
        "preset": "mobile",
        "throttling": { "rttMs": 150, "throughputKbps": 1600 },
        "screenEmulation": { "width": 360, "height": 640, "mobile": true }
      },
      "url": [
        "https://example.com/",
        "https://example.com/blog/artikel"
      ]
    },
    "assert": {
      "assertions": {
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "interactive": ["error", { "maxNumericValue": 4000 }],
        "total-byte-weight": ["error", { "maxNumericValue": 350000 }],
        "resource-summary:script": ["error", { "maxNumericValue": 200000 }],
        "resource-summary:stylesheet": ["error", { "maxNumericValue": 60000 }],
        "uses-text-compression": ["warn", { "minScore": 0.9 }]
      }
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```

## Warum `numberOfRuns: 3`

Lighthouse-Läufe schwanken. Ein einzelner Lauf kann durch Systemlast, Netzwerk-Jitter oder Caching-Zufall über oder unter dem Schwellwert liegen. Drei Läufe mit dem Median als Vergleichswert (Standardverhalten von Lighthouse CI) sind der kleinste Aufwand, der Flakiness spürbar reduziert.

## Warum `preset: mobile` mit explizitem Throttling

Ohne Drosselung misst Lighthouse auf der CI-Maschine mit deren Netzwerk- und CPU-Leistung — typischerweise deutlich besser als ein reales Mobilgerät. Die Werte oben (`rttMs: 150`, `throughputKbps: 1600`, 4×-CPU-Drosselung im `mobile`-Preset) sind eine Annäherung an ein mittleres Android-Gerät auf einer durchschnittlichen 4G-Verbindung — nicht an das schnellste verfügbare Netz.

## Wo die Zahlen herkommen und wo sie nicht mehr passen

`largest-contentful-paint`, `cumulative-layout-shift`, `interactive` sind die häufig zitierten "guten" Richtwerte für mobile Seiten bei p75. Sie sind ein Ausgangspunkt, keine Norm — ein datenintensives Dashboard hinter einem Login darf andere Werte haben als eine öffentliche Marketingseite. Wenn das Team eigene Zielwerte hat (z. B. aus RUM-Daten), gehören die hierher, nicht die Vorlage unverändert.

## Einbindung in CI (GitHub Actions, Beispiel)

```yaml
- name: Lighthouse CI
  run: |
    npm install -g @lhci/cli
    lhci autorun
```

`lhci autorun` liest automatisch `lighthouserc.json` im Projektwurzelverzeichnis. Bei einem `error`-Assert schlägt der Job fehl — das ist die eigentliche Durchsetzung des Budgets, nicht nur seine Dokumentation.
