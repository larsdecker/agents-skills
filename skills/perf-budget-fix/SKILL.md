---
name: perf-budget-fix
description: Setzt Performance-Budget-Befunde im Code um — Kompression, Render-Blocking-Ressourcen entschärfen, Code-Splitting, Font-Ladestrategie, Drittanbieter-Ladestrategie, Cache-Header, CI-Budget-Gate. Framework-gerecht, nach Wirkung priorisiert, mit Gegenprobe. Nutze diesen Skill, wenn Performance-Budget-Befunde nicht nur gefunden, sondern tatsächlich behoben werden sollen.
when_to_use: "Auslöser sind unter anderem: Performance-Budget umsetzen, Bundle verkleinern, Code-Splitting einbauen, Kompression aktivieren, Render-Blocking beheben, defer/async einbauen, font-display setzen, Drittanbieter-Skripte verzögert laden, Cache-Header setzen, Lighthouse-CI einrichten, Performance-Befunde eines Audits abarbeiten."
argument-hint: "[optional: Pfad oder Befundliste]"
---

# Perf Budget Fix

Setze Performance-Budget-Befunde im Code um — in der Reihenfolge ihrer Wirkung, mit den Mustern des jeweiligen Frameworks, ohne die Budget-Entscheidung selbst zu treffen.

## Die Grenze, die diesen Skill brauchbar macht

Ein großer Teil der Performance-Arbeit ist mechanisch: Kompression aktivieren, `defer` setzen, `font-display: swap` ergänzen, ein `lighthouserc.json` anlegen. Ein anderer Teil ist eine Geschäftsentscheidung: Welches Drittanbieter-Skript ist verzichtbar? Welcher Budget-Wert ist für dieses Projekt richtig? Darf dieses Consent-Skript wirklich erst nach der Interaktion laden?

**Den mechanischen Teil erledigst du. Die Geschäftsentscheidung bereitest du vor und legst sie zur Entscheidung vor.**

### Niemals ohne Rückfrage

- **Drittanbieter-Skripte entfernen.** Was wie totes Tracking aussieht, kann ein vertraglich zugesichertes Analytics- oder Marketing-Tool sein. Frage, statt zu löschen.
- **Ein Consent-Management- oder Rechts-Skript verzögern oder entfernen**, nur weil es render-blocking ist. Manche müssen bewusst vor allem anderen laufen. Kläre die Absicht, bevor du `defer` vorschlägst.
- **Budget-Schwellwerte in `lighthouserc.json` (oder einer eigenen Konfiguration) verändern**, um einen Fehler verschwinden zu lassen. Ein Budget ist eine Team-Entscheidung. Wenn ein Wert nicht mehr passt, ist das ein Gespräch mit dem Team, kein Ein-Zeilen-Fix.
- **Bildattribute ändern** (`width`/`height`, `loading`, `alt`). Dafür ist **`seo-fix`** zuständig — dieser Skill fasst Bild-Tags nicht an, um keine widersprüchlichen Änderungen an derselben Stelle zu erzeugen.
- **Produktive Kompressions- oder Cache-Konfiguration** (nginx, nutzerdefinierte CDN-Regeln) ohne den Hinweis, dass ein Fehler dort die gesamte Site lahmlegen kann. Vor jeder Änderung an Server-Konfigurationsdateien eine Sicherung.
- **Erfundene Byte-Einsparungen versprechen.** „Das spart 40 %" ist nur nach einer echten Vorher-Nachher-Messung eine belegbare Aussage.

## Ablauf

### Schritt 1: Befunde beschaffen

Wenn noch keine Befundliste vorliegt, erzeuge sie zuerst mit **`perf-budget-check`**. Ohne Messung optimierst du auf Vermutung — und ohne Baseline lässt sich der Fix hinterher nicht nachweisen.

### Schritt 2: Ort der Wahrheit bestimmen

Bevor du eine Zeile änderst, kläre, **wie das Projekt Ressourcen lädt und ausliefert** — sonst wirkt ein Fix nicht oder wird von einer anderen Stelle überschrieben.

```bash
cat package.json 2>/dev/null | head -40
grep -rl "next/script\|next/dynamic\|next/font" --include="*.tsx" --include="*.ts" . | head -20
```

Kläre außerdem: Läuft die Seite hinter einem CDN oder einer Edge-Plattform (Cloudflare, Vercel, Netlify)? Diese übernehmen Kompression und teils Caching häufig automatisch — ein Fix am Anwendungscode wäre dort wirkungslos, weil das Problem eine Zeile tiefer liegt. Die Muster je Framework/Plattform stehen in `references/framework-patterns.md`.

### Schritt 3: Nach Wirkung priorisieren, nicht nach Aufwand

Reihenfolge und Begründung stehen vollständig in `references/fix-priority.md`:

1. **Kompression aktivieren.** Meist eine einzelne Konfigurationszeile mit der größten Wirkung auf jedes Byte-Budget gleichzeitig.
2. **Render-Blocking entschärfen.** `defer`/`async`, kritisches CSS von nicht-kritischem trennen.
3. **JS-Bytebudget senken.** Code-Splitting, Routen-Level Lazy-Loading, toten Code entfernen.
4. **Font-Ladestrategie.** `font-display: swap`, Subsetting, Preconnect zum Font-Origin.
5. **Drittanbieter-Ladestrategie.** Nicht entfernen — verzögern (nach Interaktion, nach Consent, mit `defer`).
6. **Caching-Header.** Langlebiges Caching für gehashte Assets.
7. **CI-Budget-Gate einrichten**, wenn noch keins existiert.

Ein Fix aus Stufe 6 vor einem offenen Punkt aus Stufe 1 ist verlorene Zeit — Kompression wirkt auf jedes andere Budget gleichzeitig mit.

### Schritt 4: Umsetzen

**In kleinen, überprüfbaren Schritten.** Eine Kategorie pro Durchgang. Nach jeder Kategorie kurz zusammenfassen, was geändert wurde.

- **Vorhandene Konventionen übernehmen**, nicht danebenstellen. Wenn das Framework eine eigene Lösung hat (`next/script`, `next/font`, `next/dynamic`), die nutzen statt eine zusätzliche Abhängigkeit einzuführen.
- **Zentral statt verteilt.** Wenn zehn Seiten dasselbe Drittanbieter-Skript laden, gehört die Ladestrategie in eine gemeinsame Komponente oder Konfiguration, nicht zehnmal kopiert.
- **Keine neuen Abhängigkeiten** für das, was das Framework selbst kann. Next.js, Nuxt und Astro haben eigene Bild-, Font- und Script-Primitiven.
- **Messbar bleiben.** Wenn du Code-Splitting einführst, notiere, welche Route/Komponente ausgelagert wurde — das ist die Grundlage für die Gegenprobe.

### Schritt 5: Nachprüfen

Ein Fix ohne Gegenprobe ist eine Behauptung.

```bash
node <pfad>/perf-budget-check/scripts/perf-scan.mjs https://example.com/geaenderte-seite
```

Vergleiche das Ergebnis explizit mit dem Stand vor der Änderung — „JS von 248 KB auf 190 KB" ist eine Aussage, „sollte jetzt schneller sein" ist keine.

Zusätzlich, wenn das Projekt es hat: Build und Bundle-Analyse laufen lassen, um zu bestätigen, dass Code-Splitting tatsächlich ein separates Chunk erzeugt hat, statt nur die Import-Struktur geändert zu haben.

### Schritt 6: Berichten

- **Was geändert wurde**, je Datei.
- **Was nachweislich behoben ist**, mit Vorher/Nachher-Zahlen aus der Gegenprobe.
- **Was offen bleibt und warum** — insbesondere Drittanbieter- und Budget-Entscheidungen, die eine Rückfrage brauchten.
- **Was zusätzlich nötig ist, damit der Fix wirkt:**
  - Eine Änderung im Code ist noch nicht live — sag das explizit, statt Fertigstellung zu suggerieren.
  - CDN-/Edge-Caches können eine alte, unkomprimierte oder falsch gecachte Antwort noch eine Weile ausliefern, auch nach dem Deployment.
  - Ein neu eingerichtetes CI-Budget-Gate greift erst ab dem nächsten Pull Request, nicht rückwirkend.

Keine Erfolgsprognose zu Nutzererfahrung oder Ranking. „JS-Gewicht um 60 KB reduziert" ist belegbar, „die Seite fühlt sich jetzt schneller an" nicht ohne echte Messung.

## Abgrenzung

**`perf-budget-check`** findet und bewertet — dieser Skill setzt um. Nutze beide zusammen: prüfen, beheben, gegenprüfen.

**`seo-fix`** behebt bildbezogene CWV-Auslöser (`width`/`height`, `loading`, `alt`). Dieser Skill fasst Bild-Tags bewusst nicht an, um keine widersprüchlichen Änderungen an derselben Stelle zu erzeugen. Ein Befund zu einem Bild-Attribut gehört dorthin, nicht hierher.

## Was dieser Skill nicht tut

- **Keine Entscheidung über Budget-Werte.** Die Zahl im `lighthouserc.json` ist eine Team-Entscheidung; dieser Skill legt sie an und pflegt sie, erfindet sie aber nicht.
- **Kein Entfernen von Drittanbieter-Funktionalität ohne Rückfrage.**
- **Keine Erfolgsgarantie für echte Web-Vitals-Werte.** Dieser Skill senkt Ressourcengewicht und entschärft bekannte Auslöser; ob LCP/INP/CLS sich in der erwarteten Größenordnung verbessern, zeigt erst eine echte Messung mit `perf-budget-check`s Verweis auf Lighthouse/RUM.
- **Keine Änderungen an produktiver Server-/CDN-Konfiguration ohne die Auswirkung zu benennen.**
