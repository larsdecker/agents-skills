---
name: seo-check
description: Prüft eine Website auf technische SEO-Fehler gegen ein festes Regelwerk mit konkreten Schwellwerten: Title, Meta-Description, Canonical, Robots-Direktiven, Überschriftenstruktur, robots.txt, Sitemap, Rendering, URLs und Statuscodes, Bilder, interne Links, hreflang, Open Graph und JSON-LD. Nutze diesen Skill für SEO-Audits, technische SEO-Analysen, Indexierungsprobleme oder wenn Seiten nicht ranken oder nicht im Index landen.
when_to_use: "Auslöser sind unter anderem: SEO-Check, SEO-Audit, technisches SEO prüfen, Seite wird nicht indexiert, Seite rankt nicht, Google findet meine Seite nicht, Meta-Tags prüfen, Title und Description optimieren, Canonical-Probleme, noindex versehentlich gesetzt, robots.txt prüfen, Sitemap-Fehler, Duplicate Content, defekte Links finden, hreflang-Fehler, Rich Snippets funktionieren nicht, strukturierte Daten prüfen, Social-Preview kaputt, Open Graph testen, Core Web Vitals, Ladezeit und SEO."
argument-hint: "[url oder domain] [optional: --max-pages 5]"
allowed-tools: Read Grep Glob
---

# SEO Check

Prüfe eine Website gegen ein festes Regelwerk mit konkreten Schwellwerten und liefere eine Befundliste, die nach Wirkung sortiert ist.

## Die Reihenfolge, die über den Nutzen entscheidet

Ein SEO-Bericht, der 60 Befunde alphabetisch auflistet, führt zu keiner Entscheidung. Arbeite immer in dieser Reihenfolge, weil die späteren Stufen wirkungslos sind, solange die früheren nicht stimmen:

1. **Kann die Seite überhaupt in den Index?** Statuscode, robots.txt, noindex, Canonical. Ein perfekter Title auf einer nicht indexierbaren Seite ist wertlos.
2. **Sieht ein Crawler den Inhalt?** Server-Rendering. Wenn der Inhalt erst per JavaScript entsteht, sind alle inhaltlichen Befunde darunter Spekulation.
3. **Versteht die Suchmaschine die Seite?** Title, Description, Überschriftenstruktur, strukturierte Daten.
4. **Findet der Crawler die übrigen Seiten?** Interne Links, Sitemap, Linktiefe.
5. **Feinschliff.** Bilder, Social-Tags, URL-Kosmetik.

Sage das dem Nutzer, wenn er mit einer Liste aus einem anderen Werkzeug kommt, in der ein fehlendes `og:image:alt` neben einem versehentlichen `noindex` steht.

## Ablauf

### Schritt 1: Ziel und Umfang klären

- **Live-Website**: Domain oder einzelne URLs. Der Normalfall.
- **Lokales Projekt**: Wenn kein Live-Stand existiert, starte den Dev-Server und prüfe gegen `localhost`. Beachte, dass viele Projekte auf Nicht-Produktionsumgebungen absichtlich `noindex` setzen oder alles per robots.txt sperren — melde das dann nicht als Fehler.

Frage nach dem **Anlass**, wenn er nicht aus dem Gespräch hervorgeht. „Seite wird nicht indexiert" führt zu einer anderen Prüftiefe als „regelmäßiges Audit": Beim ersten Fall gehst du gezielt Stufe 1 und 2 durch und ignorierst den Rest zunächst.

**Wähle die Seiten bewusst.** Fünf repräsentative Seiten sind aussagekräftiger als fünfzig zufällige: Startseite, eine Übersichtsseite, zwei inhaltliche Seiten unterschiedlicher Vorlage, und eine Seite mit besonderer Funktion (Formular, Produkt, Filter). Vorlagen wiederholen sich — ein Fehler in einer Vorlage betrifft alle Seiten, die sie nutzen. Sage das im Bericht: „betrifft die Artikelvorlage, also alle N Artikel".

### Schritt 2: Scan ausführen

Das Script liegt neben dieser Datei unter `scripts/seo-scan.mjs`:

```bash
node scripts/seo-scan.mjs --site https://example.com --max-pages 5
```

Einzelne Seiten:

```bash
node scripts/seo-scan.mjs https://example.com/a https://example.com/b
```

Den passenden Pfad bestimmen:

- **Claude Code als Plugin:** `node "${CLAUDE_PLUGIN_ROOT}/scripts/seo-scan.mjs" --site …`
- **Andere Agenten oder manuelle Installation:** relativ zum Verzeichnis dieser `SKILL.md`, üblicherweise `.agents/skills/seo-check/`.
- **Pfad unbekannt:** im Projekt nach `seo-scan.mjs` suchen, statt zu raten.

| Option | Wirkung |
| :-- | :-- |
| `--site <url>` | Origin für Site-Prüfungen; zieht Seiten aus der Sitemap |
| `--max-pages <n>` | Obergrenze geprüfter Seiten (Standard: 5) |
| `--link-sample <n>` | Interne Links pro Seite, die auf Statuscode geprüft werden (Standard: 15) |
| `--image-sample <n>` | Bilder pro Seite, deren Dateigröße geprüft wird (Standard: 10) |
| `--no-hreflang-return` | Reziprozitätsprüfung überspringen (spart Anfragen) |
| `--json` / `--out <datei>` | Maschinenlesbare Ausgabe |

Das Script führt nur GET- und HEAD-Anfragen aus, wartet zwischen den Anfragen und identifiziert sich mit eigenem User-Agent. Es verändert nichts.

Alle Schwellwerte stehen im Objekt `LIMITS` am Anfang des Scripts. Wenn der Nutzer andere Werte braucht, ändere sie dort, statt Befunde nachträglich zu filtern.

### Schritt 3: Befunde prüfen, nicht durchreichen

Der Scan liefert `fehler`, `warnung` und `hinweis`. Deine Aufgabe ist, sie zu gewichten und **falsch positive Treffer zu entfernen**. Ein Bericht, in dem drei offensichtlich unpassende Befunde stehen, verliert die Glaubwürdigkeit für die richtigen.

Typische Fälle, in denen der Scan zu wenig weiß:

- **`noindex` ist häufig gewollt.** Filterseiten, interne Suchergebnisse, Danke-Seiten, Login-Bereiche. Der Scan meldet die Direktive, weil er die Absicht nicht kennt. Prüfe die Seite, bevor du zum Entfernen rätst.
- **Kurze Titles sind auf manchen Seiten korrekt.** „Impressum" braucht keine 55 Zeichen.
- **Fehlende Description ist kein Fehler, sondern eine Abwägung.** Google schreibt Descriptions ohnehin häufig um. Auf Seiten mit Suchpotenzial lohnt sie, auf 2.000 Filterseiten nicht.
- **Lesbarkeitswerte für deutschen Text.** Der oft genannte Zielbereich 60–70 ist an englischem Text kalibriert. Deutsche Komposita drücken den Wert systematisch, deutsche Fachtexte liegen regelmäßig bei 30–50. Das Script nutzt für deutschsprachige Seiten die Amstad-Variante der Formel und meldet erst ab deutlich niedrigeren Werten — bewerte trotzdem relativ zu vergleichbaren Seiten, nie absolut.
- **Bildformate.** Ein Hinweis auf WebP ist gegenstandslos, wenn das CMS die Konvertierung nicht unterstützt.

Das vollständige Regelwerk mit Begründung je Prüfung steht in `references/rules.md`. Statuscodes und Weiterleitungen: `references/status-codes.md`. Pflichtfelder je Schema-Typ: `references/structured-data.md`.

### Schritt 4: Prüfen, was das Script nicht kann

Diese Punkte entscheiden über den Wert des Audits und sind nicht automatisierbar. Arbeite sie am wichtigsten Seitentyp durch:

**Passt der Title zur Suchintention?** Das Script prüft Länge und Eindeutigkeit, nicht Relevanz. Lies Title, H1 und den ersten Absatz zusammen: Beantworten sie dieselbe Frage? Ein Title, der etwas anderes verspricht als die Seite hält, wird von Google umgeschrieben — und dann ist die Optimierung verloren.

**Steht der Hauptbegriff vorne?** Ein Title, der mit dem Markennamen beginnt, verschenkt die wichtigste Position. Prüfe das manuell; automatisch ist es ohne bekanntes Zielkeyword nicht entscheidbar.

**Deckt der Inhalt ab, was die Frage verlangt?** Es gibt keinen Wortzahl-Schwellwert. Die richtige Frage ist, ob die naheliegenden Unterfragen beantwortet werden. Vollständigkeit schlägt Länge.

**Stimmen strukturierte Daten mit dem sichtbaren Inhalt überein?** Das ist die einzige Prüfung mit echtem Abmahnrisiko: Markup für Inhalte, die auf der Seite nicht sichtbar sind, und Bewertungen ohne echte Rezensionen sind Richtlinienverstöße und können eine manuelle Maßnahme auslösen. Wenn du so etwas findest, melde es als schwersten Befund des Berichts, unabhängig von der Einstufung des Scans.

**Core Web Vitals.** Das Script misst sie nicht — dafür braucht es einen echten Browser oder Felddaten. Es meldet nur bekannte bildbezogene Auslöser wie fehlende Bildabmessungen. Für Ressourcengewicht, Render-Blocking-Ressourcen, Kompression und ein CI-Budget-Gate ist der Skill **`perf-budget-check`** zuständig. Verweise für die eigentliche Messung zusätzlich auf PageSpeed Insights oder die Search Console.

### Schritt 5: Bericht

Standardmäßig im Chat, nicht als Datei — außer der Nutzer will ein Dokument.

1. **Ein Satz zum Gesamtbild.** Ehrlich. „Technisch saubere Seite mit einem Fehler, der alle Social-Vorschauen betrifft" ist eine bessere erste Zeile als eine Punktzahl.
2. **Blocker** (Stufe 1 und 2): jeweils Befund, Wirkung, konkreter Fix.
3. **Verständnis und Verlinkung** (Stufe 3 und 4).
4. **Feinschliff**, gesammelt in einer Liste.
5. **Was in Ordnung ist.** Zur Abgrenzung, damit niemand etwas ändert, das funktioniert.
6. **Was nicht geprüft wurde** und wer beziehungsweise was es prüfen müsste.

Nenne bei jedem Befund, ob er **eine Seite oder eine Vorlage** betrifft. Das ist der Unterschied zwischen fünf Minuten und fünf Tagen Arbeit und die wichtigste Information für die Priorisierung.

Keine Punktzahl. Ein „SEO-Score 78/100" suggeriert Messgenauigkeit, die es nicht gibt, und lenkt von der Frage ab, welche zwei Dinge zuerst zu tun sind.

### Schritt 6: Umsetzung anbieten

Wenn Befunde im Code behoben werden können und Zugriff auf das Repository besteht, biete die Umsetzung an. Dafür gibt es den Skill **`seo-fix`**: er kennt die Framework-Muster, die Reihenfolge nach Wirkung und die Grenzen, an denen eine inhaltliche Entscheidung nötig ist. Übergib ihm die Befundliste, statt improvisiert zu ändern.

## Abgrenzung zu anderen Skills

**`geo-audit`** deckt Auffindbarkeit in KI-Antwortmaschinen ab: Retrieval- gegen Training-Crawler, llms.txt, Zitierfähigkeit auf Absatzebene, Entity-Klarheit. Dieser Skill prüft das **bewusst nicht**, um keine widersprüchlichen Empfehlungen zu erzeugen. Wenn die Frage in Richtung ChatGPT, Perplexity oder AI Overviews geht, nutze `geo-audit`.

Die Grenze ist einfach: klassische Suche mit Ergebnisliste → `seo-check`. Formulierte Antwort mit Quellenangabe → `geo-audit`. Beide zusammen ergeben das vollständige Bild.

## Was dieser Skill nicht kann

- **Keine Ranking-Prognose.** Technische Korrektheit ist eine Voraussetzung, keine Ursache für Platzierungen. Wer nach „wann sind wir auf Platz 1" fragt, bekommt keine seriöse Antwort — sondern die Auskunft, welche Hürden weg sind.
- **Keine Keyword-Recherche und keine Wettbewerbsanalyse.** Dafür braucht es Suchvolumendaten, die von außen nicht zugänglich sind.
- **Keine Backlink-Bewertung.** Nicht ohne externen Index prüfbar.
- **Keine Aussage über Inhaltsqualität.** Der Scan prüft Form. Ein technisch perfekter, inhaltlich falscher Artikel besteht diesen Check.
- **Kein Ersatz für die Search Console.** Was Google tatsächlich indexiert hat, steht nur dort. Bei Indexierungsproblemen, die nach einem sauberen Scan bestehen bleiben, ist die URL-Prüfung in der Search Console der nächste Schritt.
