# Reihenfolge nach Wirkung

Jeder Eintrag ist als **mechanisch** (der Skill darf selbst handeln) oder **Entscheidung** (Rückfrage nötig) markiert.

## 1. Kompression aktivieren — mechanisch

Wirkt auf JS-, CSS- und HTML-Budget gleichzeitig, meist die größte Einzelwirkung für den geringsten Aufwand. Bei den meisten modernen Hosts (Vercel, Netlify, Cloudflare) bereits aktiv — prüfe das zuerst, bevor du eine Änderung vorschlägst, die nichts bewirkt, weil die Plattform es längst übernimmt.

Bei eigenem Server/nginx: `gzip on;` oder besser `brotli on;` (mit `ngx_brotli`-Modul) in der Server-Konfiguration.

## 2. Render-Blocking-Ressourcen entschärfen — mechanisch, mit einer Ausnahme

**Scripts:** `defer` setzen, wenn Ausführungsreihenfolge relativ zu anderen Scripts erhalten bleiben muss; `async`, wenn nicht. Ans Ende von `<body>` verschieben ist die Variante ohne Framework-Unterstützung.

**Ausnahme (Entscheidung):** Ein Consent-Management- oder rechtlich zwingendes Skript, das bewusst vor allem anderen laufen muss. Frage nach der Absicht, bevor du es verzögerst.

**CSS:** Kritisches CSS inline, Rest asynchron nachladen (`<link rel="preload" as="style" onload="this.rel='stylesheet'">` oder Framework-eigene Critical-CSS-Extraktion). Bei kleinen Stylesheets (wenige KB) ist der Aufwand meist höher als der Nutzen — das reine Byte-Budget für CSS fängt die Größe ohnehin ein.

## 3. JS-Bytebudget senken — mechanisch (Struktur), Entscheidung (was entfernt wird)

- **Routen-Level Code-Splitting**: Ist in modernen Frameworks meist der Standard (Next.js App Router, SvelteKit) — prüfe, ob eine Route versehentlich alles eager importiert, statt Splitting nachzurüsten, wo es schon vorhanden wäre.
- **Komponenten-Level Lazy-Loading** für alles, was nicht beim ersten Render sichtbar ist: Modals, Tabs-Inhalte unterhalb der ersten Ansicht, schwere Editor-/Chart-Bibliotheken.
- **Toten Code entfernen**: Mechanisch, wenn eine Bundle-Analyse ihn eindeutig als unreferenziert zeigt.
- **Eine Bibliothek durch eine leichtere ersetzen**: Entscheidung — das ist ein Architektur-Trade-off, kein reiner Performance-Fix, und kann Funktionalität kosten.

## 4. Font-Ladestrategie — mechanisch

- `font-display: swap` (oder `optional`, wenn Layout-Stabilität wichtiger ist als sofort sichtbarer Web-Font) in jedem `@font-face`.
- `<link rel="preconnect">` zum Font-Origin, wenn Fonts von einer anderen Domain geladen werden.
- Subsetting auf die tatsächlich genutzten Zeichen/Sprachen, wenn das Build-Tooling es unterstützt.
- Selbst gehostete Fonts statt externem Font-Service, wo möglich — spart einen kompletten Drittanbieter-Origin.

## 5. Drittanbieter-Ladestrategie — Entscheidung, welches Skript; mechanisch, wie es lädt

**Nie entfernen ohne Rückfrage.** Aber die Ladestrategie ändern ist fast immer sicher:

- Nach Consent laden statt beim Seitenaufbau, wenn rechtlich ohnehin eine Einwilligung nötig ist.
- Nach der ersten Interaktion laden (Klick, Scroll) für alles, das nicht sofort gebraucht wird (Chat-Widgets, manche Analytics).
- `defer`/`async` für alles, das synchron im `<head>` lädt, ohne es zu müssen.

## 6. Caching-Header — mechanisch

Für Dateien mit Hash im Namen: `Cache-Control: public, max-age=31536000, immutable`. Ohne Risiko, weil eine inhaltliche Änderung ohnehin eine neue URL erzeugt. Für nicht gehashte Dateien (z. B. `favicon.ico`, HTML-Antworten) kürzere `max-age` oder `must-revalidate`, damit Updates ankommen.

## 7. CI-Budget-Gate einrichten — mechanisch (Vorlage), Entscheidung (Schwellwerte)

Eine `lighthouserc.json` mit `assert`-Schwellen anzulegen ist mechanisch — die Vorlage steht in `lighthouserc-template.md`. **Die konkreten Zahlen sind Team-Entscheidung**, nicht geraten oder von einer anderen Website übernommen. Schlage plausible Startwerte vor (z. B. aus `perf-budget-check`s aktuellem Scan-Ergebnis plus etwas Puffer), aber markiere sie ausdrücklich als Vorschlag zur Bestätigung.
