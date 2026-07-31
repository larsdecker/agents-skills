---
name: perf-budget-check
description: Prüft eine Website gegen Performance-Budgets für Ressourcengewicht und Lade-Strategie ohne echten Browser — JS/CSS/Bild-Bytes, Requestanzahl, Drittanbieter-Origins, Render-Blocking-Ressourcen, Kompression, Cache-Header, Font-Ladestrategie und ein optionales CI-Budget-Gate (lighthouserc.json). Nutze diesen Skill für Performance-Budget-Audits, Bundle-Analysen, wenn Core Web Vitals im Feld schlechter sind als im Labor, oder wenn ein Team Performance-Ziele überhaupt erst definieren will.
when_to_use: "Auslöser sind unter anderem: Performance Budget prüfen, Performance-Audit, Bundle zu groß, JS-Gewicht messen, Lighthouse-Budget einrichten, Core Web Vitals verschlechtern sich, Seite lädt langsam, Render-Blocking-Ressourcen finden, Drittanbieter-Skripte prüfen, Kompression prüfen, Cache-Header prüfen, font-display prüfen, Performance-Regression finden, CI-Budget-Gate einrichten."
argument-hint: "[url] [optional: --budget budgets.json]"
allowed-tools: Read Grep Glob
---

# Perf Budget Check

Prüfe eine Website gegen Performance-Budgets für Ressourcengewicht und Lade-Strategie — und sage klar, was davon eine echte Web-Vitals-Messung ersetzt und was nicht.

## Die Grenze, die diesen Skill nützlich macht

Ein Performance-Budget besteht aus zwei völlig unterschiedlichen Dingen: **Nutzer-zentrierte Metriken** (LCP, INP, CLS, TBT) und **Ressourcen-Budgets** (KB JS/CSS/Bilder, Requestanzahl, Drittanbieter-Zahl). Die ersten brauchen einen echten Browser oder Felddaten — Lighthouse, PageSpeed Insights, CrUX, RUM. Kein HTTP-Request kann simulieren, wie lange ein Hauptthread blockiert ist.

**Dieser Skill misst ausschließlich die zweite Kategorie** — und die bekannten Auslöser, die auf die erste einzahlen: Bytegewicht, Render-Blocking-Ressourcen, fehlende Kompression, fehlendes `font-display`, fehlende Resource Hints, fehlendes CI-Gate. Wer nach dem tatsächlichen LCP-Wert fragt, bekommt die ehrliche Antwort: dafür braucht es ein anderes Werkzeug, siehe Schritt 4.

## Ablauf

### Schritt 1: Ziel und Kontext klären

- **Live-Website**: eine oder mehrere URLs. Der Normalfall.
- **Lokales Projekt**: Dev-Server starten und gegen `localhost` prüfen. Bytegewicht kann sich lokal (kein CDN, keine Kompression im Dev-Modus) deutlich von Produktion unterscheiden — sag das dazu, statt Dev-Zahlen als Produktionszahlen zu präsentieren.

**Route bewusst wählen.** Eine Startseite und eine typische Inhaltsseite (Artikel, Produkt) reichen für den Einstieg — sie haben meist unterschiedliche Budgets (mehr Bild-Gewicht auf der Startseite, mehr Text auf Artikelseiten) und sollten nicht gegen dieselben Schwellwerte laufen, wenn das Projekt route-spezifische Budgets nutzt.

Frage nach der **Baseline**, wenn sie nicht genannt wird. „Ist das schon immer so groß" braucht ein anderes Vorgehen als „seit dem Deploy letzte Woche langsamer" — im zweiten Fall ist ein Vergleich zweier Scans (vorher/nachher) aussagekräftiger als ein einzelner Schwellwert-Check.

### Schritt 2: Scan ausführen

Das Script liegt neben dieser Datei unter `scripts/perf-scan.mjs`:

```bash
node scripts/perf-scan.mjs https://example.com https://example.com/blog/artikel
```

Den passenden Pfad bestimmen:

- **Claude Code als Plugin:** `node "${CLAUDE_PLUGIN_ROOT}/scripts/perf-scan.mjs" …`
- **Andere Agenten oder manuelle Installation:** relativ zum Verzeichnis dieser `SKILL.md`, üblicherweise `.agents/skills/perf-budget-check/`.
- **Pfad unbekannt:** im Projekt nach `perf-scan.mjs` suchen, statt zu raten.

| Option | Wirkung |
| :-- | :-- |
| `--asset-sample <n>` | Externe Skripte/Stylesheets pro Seite, die geprüft werden (Standard: 20) |
| `--budget <datei>` | JSON mit Budget-Overrides, z. B. `{"jsBytesMax": 150000}` |
| `--repo-dir <pfad>` | Verzeichnis für die CI-Budget-Gate-Prüfung (Standard: aktuelles Arbeitsverzeichnis) |
| `--json` / `--out <datei>` | Maschinenlesbare Ausgabe |

Das Script führt nur GET-Anfragen aus (keine HEAD-Anfragen — viele CDNs mit Brotli-Streaming liefern dort keinen `Content-Length`), zählt die real übertragenen Bytes selbst statt sich auf Header zu verlassen, und verändert nichts außer der optionalen `--out`-Datei.

Alle Schwellwerte stehen im Objekt `BUDGETS` am Anfang des Scripts und in `references/budget-defaults.md`. Wenn der Nutzer projektspezifische Budgets hat (z. B. aus einem `lighthouserc.json`), nutze `--budget`, statt Befunde nachträglich zu filtern.

### Schritt 3: Befunde einordnen, nicht durchreichen

Typische Fälle, in denen der Scan zu wenig weiß:

- **Ressourcen-Sample statt Vollständigkeit.** `--asset-sample` begrenzt, wie viele Skripte/Stylesheets pro Seite geprüft werden. Bei sehr vielen Ressourcen ist die Summe eine Untergrenze, kein exaktes Gesamtgewicht — sag das, wenn die Seite mehr Ressourcen hat als der Sample-Wert.
- **"Above the fold" ist eine Positions-Näherung.** Der Scan nimmt die ersten Bilder im HTML als ATF-Kandidaten, weil er keinen Viewport kennt. Bei Layouts, in denen das erste `<img>` im DOM nicht das erste sichtbare ist (z. B. versteckte Mobile-Navigation mit Bild), ist der Wert irreführend — prüfe das visuell, bevor du den Befund weiterreichst.
- **Drittanbieter-Erkennung ist grob.** Sie vergleicht nur den Hostnamen, keine eTLD+1-Auflösung. Ein Consent-Layer, der mehrere Subdomains derselben Plattform lädt, kann als mehrere Origins erscheinen, obwohl es wirtschaftlich einer ist.
- **Render-Blocking ist nicht automatisch falsch.** Ein synchrones Head-Script kann bewusst so sein (z. B. ein Consent-Management-Skript, das vor allem anderen laufen muss). Frage nach der Absicht, bevor du pauschal `defer` empfiehlst.
- **Kein CI-Gate ist kein Fehler, sondern eine Lücke.** Manche Teams steuern Budgets bewusst über RUM-Alarme statt CI — dann ist der Hinweis kontextlos. Prüfe, ob es einen alternativen Mechanismus gibt, bevor du auf `lighthouserc.json` bestehst.

Das vollständige Regelwerk mit Begründung steht in `references/budget-defaults.md`. Welches statische Signal auf welche Web-Vitals-Metrik einzahlt (und wann nicht): `references/static-triggers.md`.

### Schritt 4: Was das Script nicht kann

**LCP, INP, CLS, TBT selbst.** Das Script rechnet nie einen dieser Werte aus. Für eine echte Messung:

- **Labor:** Lighthouse (CLI oder in Chrome DevTools), WebPageTest — mit mobilem Profil (4×-CPU-Throttling, gedrosseltes Netz).
- **Feld:** Chrome UX Report (CrUX), Search Console („Wichtige Web-Vitals"), eigenes RUM.

Nenne bei einer Empfehlung immer, welche der beiden Quellen gemeint ist — Labor- und Feldwerte weichen systematisch voneinander ab, und „grünes CI, rotes RUM" ist der mit Abstand häufigste Widerspruch in der Praxis.

**Bildattribute.** `width`/`height` (CLS-Risiko), `loading="lazy"` auf dem ersten Bild (LCP-Risiko) und `alt`-Texte prüft bewusst **nicht** dieser Skill, sondern **`seo-check`** — damit es zu jedem Bild nur eine Quelle für Befunde gibt und keine widersprüchlichen Empfehlungen entstehen.

**Tatsächliche Hauptthread-Auslastung.** Bytegewicht korreliert mit TBT/INP, ist aber keine Messung davon. Ein kleines, aber rechenintensives Skript kann schlimmer sein als ein großes, das nur Daten transportiert.

### Schritt 5: Bericht

Standardmäßig im Chat, nicht als Datei — außer der Nutzer will ein Dokument.

1. **Ein Satz zum Gesamtbild.** Ehrlich, mit Zahl: „JS liegt 48 KB über dem Budget, der Rest ist im Rahmen" ist besser als eine Bewertung ohne Zahl.
2. **Budget-Verstöße** (Fehler): JS/CSS über dem Limit — das sind fehlende Diät, keine Kosmetik.
3. **Lade-Strategie** (Warnungen): Render-Blocking, Requestanzahl, Drittanbieter-Zahl.
4. **Feinschliff** (Hinweise): Kompression, Caching, Fonts, Resource Hints, CI-Gate.
5. **Was in Ordnung ist.** Zur Abgrenzung.
6. **Was nicht gemessen wurde**, mit Verweis auf Lighthouse/RUM/`seo-check` je nach Punkt.

Keine Gesamtpunktzahl. „Performance-Score 62" suggeriert eine Präzision, die eine reine Byte-Analyse nicht hat.

### Schritt 6: Umsetzung anbieten

Wenn Befunde behoben werden sollen und Zugriff auf das Repository besteht, biete den Skill **`perf-budget-fix`** an: er kennt Framework-Muster für Code-Splitting, Ladestrategien und CI-Wiring. Übergib ihm die Befundliste, statt improvisiert zu ändern.

## Abgrenzung zu anderen Skills

**`seo-check`** deckt bildbezogene CWV-Auslöser bereits ab (`width`/`height`, `loading="lazy"` auf dem ersten Bild). Dieser Skill wiederholt das bewusst nicht, sondern arbeitet auf Ebene des Gesamtgewichts und der Lade-Reihenfolge.

**`geo-audit`** und **`seo-check`** decken Auffindbarkeit ab, nicht Ladezeit. Wenn die Frage in Richtung „wird meine Seite gefunden" statt „wie schnell lädt sie" geht, sind das die richtigen Skills.

## Was dieser Skill nicht kann

- **Keine LCP/INP/CLS/TBT-Messung.** Erfordert einen echten Browser oder Felddaten — siehe Schritt 4.
- **Keine vollständige Request-Waterfall.** Nur Ressourcen, die im initialen HTML referenziert sind; von JavaScript nachgeladene Requests (Client-Routing, dynamische Imports zur Laufzeit) sieht der Scan nicht.
- **Keine Aussage über echte Nutzererfahrung.** Ein Budget-Verstoß ist ein Risiko, keine Garantie für eine schlechte Erfahrung — und Einhaltung ist keine Garantie für eine gute.
- **Kein Ersatz für Lighthouse CI.** Dieser Skill ergänzt ein CI-Gate, ersetzt es nicht.
