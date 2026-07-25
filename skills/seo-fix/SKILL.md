---
name: seo-fix
description: Behebt technische SEO-Mängel im Code: setzt Metadaten, Canonicals, Robots-Direktiven, Überschriftenstruktur, Bildattribute, hreflang, Open Graph und JSON-LD framework-gerecht um, priorisiert nach Wirkung und prüft das Ergebnis nach. Nutze diesen Skill, wenn SEO-Probleme nicht nur gefunden, sondern tatsächlich im Projekt behoben werden sollen.
when_to_use: "Auslöser sind unter anderem: SEO optimieren, SEO-Fehler beheben, Meta-Tags einbauen, Title und Description setzen, Canonical einbauen, strukturierte Daten ergänzen, JSON-LD hinzufügen, Open Graph einrichten, Social-Preview reparieren, hreflang einbauen, Bilder SEO-fertig machen, alt-Texte ergänzen, Sitemap generieren, robots.txt korrigieren, noindex entfernen, SEO-Befunde umsetzen, Ergebnisse eines SEO-Audits abarbeiten."
argument-hint: "[optional: Pfad oder Befundliste]"
---

# SEO Fix

Setze technische SEO-Mängel im Code um — in der Reihenfolge ihrer Wirkung, mit den Mustern des jeweiligen Frameworks, und ohne Inhalte zu erfinden.

## Die Grenze, die diesen Skill brauchbar macht

Ein großer Teil der SEO-Arbeit ist mechanisch: ein Canonical setzen, `width`/`height` ergänzen, JSON-LD korrigieren. Ein anderer Teil ist eine inhaltliche Entscheidung: Was ist das Hauptthema dieser Seite? Welcher Begriff gehört in den Title? Ist dieses `noindex` gewollt?

**Den mechanischen Teil erledigst du. Den inhaltlichen Teil bereitest du vor und legst ihn zur Entscheidung vor.**

Wer diese Grenze verwischt, produziert Schaden, der schwer zu finden ist: 200 automatisch generierte Titles, die alle plausibel klingen und keiner die Seite trifft. Google schreibt solche Titles um, und dann war die ganze Arbeit wirkungslos.

### Niemals ohne Rückfrage

- **Inhaltliche Aussagen erfinden.** Ein Title oder eine Description muss aus dem tatsächlichen Seiteninhalt hervorgehen. Wenn der Inhalt nicht hergibt, worum es geht, ist das ein Inhaltsproblem und keine Metadaten-Aufgabe.
- **`noindex` entfernen.** Es ist oft gewollt. Frage, bevor du eine Seite indexierbar machst — im Zweifel legst du eine Seite offen, die nicht öffentlich sein soll.
- **Strukturierte Daten für nicht sichtbare Inhalte anlegen.** Richtlinienverstoß mit Risiko einer manuellen Maßnahme. Gilt ausnahmslos, auch wenn der Nutzer ausdrücklich danach fragt: dann erklärst du das Risiko und schlägst vor, den Inhalt sichtbar zu ergänzen.
- **Bewertungen, Sterne oder Rezensionszahlen auszeichnen**, die es auf der Seite nicht gibt.
- **`dateModified` auf das Deployment-Datum setzen.** Das entwertet ein Signal, das Google zur Crawl-Steuerung nutzt. Das Datum muss eine inhaltliche Änderung abbilden.
- **Weiterleitungen für Live-Traffic ändern**, ohne die Auswirkung zu benennen. Eine falsche Regel nimmt eine Site vom Netz.
- **`alt`-Texte für Bilder erfinden, die du nicht gesehen hast.** Wenn der Kontext den Bildinhalt nicht hergibt, markiere die Stelle statt zu raten. Ein falscher `alt`-Text ist für Screenreader-Nutzer schlechter als keiner.

## Ablauf

### Schritt 1: Befunde beschaffen

Wenn noch keine Befundliste vorliegt, erzeuge sie zuerst mit dem Skill **`seo-check`**. Ohne Messung optimierst du auf Vermutung.

Liegt eine Liste aus einem anderen Werkzeug vor: übernimm sie, aber **prüfe jeden Befund am Code**, bevor du ihn umsetzt. Fremdwerkzeuge melden regelmäßig Dinge, die im konkreten Projekt keine sind — etwa fehlende Descriptions auf Seiten, die absichtlich nicht in den Index sollen.

### Schritt 2: Framework und Ort der Wahrheit bestimmen

Bevor du eine einzige Zeile änderst, kläre, **wo Metadaten in diesem Projekt herkommen**. Der häufigste Fehler an dieser Stelle ist, einen Title an der falschen von drei möglichen Stellen zu setzen — die Änderung wirkt dann nicht oder wird überschrieben.

```bash
cat package.json 2>/dev/null | head -40
ls -a | head -30
```

Suche nach vorhandenen Mustern, statt neue einzuführen:

```bash
grep -rl "generateMetadata\|useSeoMeta\|<Head>\|MetaTags\|og:title" --include="*.tsx" --include="*.ts" --include="*.vue" --include="*.astro" --include="*.svelte" . | head -20
```

Die Muster je Framework stehen in `references/framework-patterns.md`. Wenn das Projekt bereits ein eigenes Metadaten-Modul hat, erweitere dieses — führe keinen zweiten Weg ein. Zwei konkurrierende Quellen für denselben Tag sind die Ursache dafür, dass Fixes „nicht greifen".

Kläre außerdem: Werden Seiten aus einer **Vorlage** erzeugt? Dann ist eine Änderung an der Vorlage ein Fix für alle betroffenen Seiten — und genau dort liegt der Hebel. Sage im Ergebnis, wie viele Seiten eine Änderung betrifft.

### Schritt 3: Nach Wirkung priorisieren, nicht nach Aufwand

Arbeite in dieser Reihenfolge. Die Begründung und die vollständige Liste stehen in `references/fix-priority.md`.

1. **Indexierbarkeit** — versehentliches `noindex`, fatale Kombination aus robots.txt-Sperre und `noindex`, Canonical auf 404 oder Weiterleitung, 5xx-Fehler, defektes `og:image` mit Site-Reichweite.
2. **Sichtbarkeit für Crawler** — Inhalte, die erst clientseitig entstehen; Navigation ohne echte `<a href>`; gesperrte JS/CSS-Dateien.
3. **Verständnis** — Title, Description, H1 und Hierarchie, strukturierte Daten.
4. **Verlinkung und Entdeckbarkeit** — interne Links auf 200-URLs, Sitemap, Linktiefe.
5. **Feinschliff** — Bildattribute, Formate, Social-Tags, URL-Kosmetik.

Ein Fix aus Stufe 5 vor einem offenen Punkt aus Stufe 1 ist verlorene Zeit. Wenn der Nutzer mit Stufe 5 anfangen will, sag es einmal und mach dann, was er entschieden hat.

### Schritt 4: Umsetzen

**In kleinen, überprüfbaren Schritten.** Eine Kategorie pro Durchgang, nicht alles gleichzeitig. Nach jeder Kategorie kurz zusammenfassen, was geändert wurde.

Regeln für die Umsetzung:

- **Vorhandene Konventionen übernehmen.** Formatierung, Benennung, Kommentardichte und Sprache der umgebenden Datei.
- **Zentral statt verteilt.** Wenn zehn Seiten dasselbe Canonical-Muster brauchen, gehört das in eine Funktion oder in die Vorlage, nicht zehnmal kopiert.
- **Keine neuen Abhängigkeiten** für Dinge, die das Framework selbst kann. Next.js, Nuxt, Astro und SvelteKit haben alle eine eigene Metadaten-API — ein SEO-Paket zusätzlich zu installieren erzeugt genau die zweite Quelle, die Fixes unwirksam macht.
- **Generiertes bleibt generiert.** Sitemaps, Feeds und `llms.txt` gehören in die Build-Pipeline. Eine handgepflegte Sitemap ist beim nächsten neuen Inhalt veraltet. Wenn das Projekt schon ein Generator-Script hat, erweitere es dort.
- **Bei Textinhalten: Vorschlag statt Alleingang.** Titles und Descriptions formulierst du aus dem vorhandenen Inhalt und legst sie zur Prüfung vor, bevor du sie über viele Seiten ausrollst. Die Sprachregeln stehen in `references/copy-rules.md`.

### Schritt 5: Nachprüfen

Ein Fix ohne Gegenprobe ist eine Behauptung.

```bash
node <pfad>/seo-check/scripts/seo-scan.mjs https://example.com/geaenderte-seite
```

Bei lokaler Entwicklung gegen den Dev-Server prüfen. Beachte dabei zwei Fallen:

- Viele Projekte setzen auf Nicht-Produktionsumgebungen absichtlich `noindex` oder sperren alles per robots.txt. Diese Befunde sind dort keine Fehler.
- Prüfe das **ausgelieferte HTML**, nicht die gerenderte DOM. Ein Tag, das erst per JavaScript entsteht, ist für die meisten Crawler nicht vorhanden — genau das war in Stufe 2 der Befund.

```bash
curl -s https://example.com/seite | grep -i "<title>\|og:image\|canonical"
```

Prüfe zusätzlich, dass nichts kaputtgegangen ist: Build und Typprüfung laufen lassen, wenn das Projekt sie hat.

### Schritt 6: Berichten

Kurz und faktisch:

- **Was geändert wurde**, je Datei, und **wie viele Seiten** davon betroffen sind
- **Was nachweislich behoben ist**, mit dem Ergebnis der Gegenprobe
- **Was offen bleibt und warum** — insbesondere alles, was eine inhaltliche Entscheidung braucht
- **Was zusätzlich nötig ist, damit der Fix wirkt.** Dieser Punkt wird meistens vergessen und ist der häufigste Grund, warum eine Korrektur „nichts gebracht hat":
  - Social-Plattformen cachen Vorschauen tage- bis wochenlang. Nach einem `og:image`-Fix muss der Cache aktiv erneuert werden (Facebook Sharing Debugger, LinkedIn Post Inspector).
  - Eine neue Sitemap muss in der Search Console eingereicht werden.
  - Nach einem `noindex`-Ausbau dauert die Wiederaufnahme Tage bis Wochen; die URL-Prüfung in der Search Console beschleunigt sie für einzelne Seiten.
  - Eine Änderung wirkt erst nach dem Deployment. Sage explizit, wenn der Fix im Code liegt, aber noch nicht live ist.

Keine Erfolgsprognose. „Das behebt X" ist belegbar, „das verbessert das Ranking" nicht.

## Abgrenzung

**`seo-check`** findet und bewertet — dieser Skill setzt um. Nutze beide zusammen: prüfen, beheben, gegenprüfen.

**`geo-audit`** deckt Auffindbarkeit in KI-Antwortmaschinen ab (llms.txt, Retrieval-Crawler, Zitierfähigkeit). Dieser Skill fasst diese Bereiche bewusst nicht an, um keine widersprüchlichen Änderungen zu erzeugen. Wenn ein Befund dorthin gehört, sage es und verweise.

## Was dieser Skill nicht tut

- **Keine Inhaltserstellung.** Fehlender Inhalt ist kein SEO-Mangel, sondern offener Scope.
- **Keine Keyword-Recherche.** Ohne Suchvolumendaten wäre jede Zielbegriff-Empfehlung geraten.
- **Keine Performance-Optimierung.** Core Web Vitals verlangen Messung und Architekturarbeit. Dieser Skill behebt die auszeichnungsseitigen Auslöser — fehlende Bildabmessungen, lazy geladene Hero-Bilder — nicht die Ursachen im Bundle.
- **Keine Änderungen an produktiven Weiterleitungen ohne ausdrückliche Freigabe.**
