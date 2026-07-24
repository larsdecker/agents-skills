# llms.txt: Format und Regeln

`llms.txt` liegt im Wurzelverzeichnis der Domain und beschreibt in Markdown, worum es auf der Site geht und welche Seiten die wichtigsten sind. Die Idee: ein Sprachmodell soll ohne Crawl der gesamten Site erkennen, was hier zu finden ist.

**Ehrliche Einordnung vorweg:** Das Format ist ein Community-Vorschlag. Keiner der großen Anbieter hat öffentlich zugesichert, es auszuwerten. Der Aufwand ist minimal und es schadet nichts – aber wer ausbleibende Sichtbarkeit damit erklärt, sucht am falschen Ort. Kommuniziere sie als billige Ergänzung, nicht als Maßnahme mit belegter Wirkung.

---

## Aufbau

````markdown
# Name der Site

> Ein Satz, der beschreibt, worum es geht und für wen.

Optionaler Absatz mit Kontext: Autor, Sprache, Art der Inhalte.

## Abschnitt

- [Titel der Seite](https://example.com/pfad): Ein Satz, was dort steht.
- [Weitere Seite](https://example.com/pfad2): Ein Satz, was dort steht.

## Weiterer Abschnitt

- [Seite](https://example.com/pfad3): Beschreibung.
````

**Verbindliche Elemente**

1. **H1 mit dem Namen der Site.** Genau eine.
2. **Blockquote direkt darunter** mit einer Ein-Satz-Zusammenfassung. Das ist die Zeile, die am wahrscheinlichsten gelesen wird – sie verdient die meiste Sorgfalt.
3. **H2-Abschnitte** als Gruppierung.
4. **Linkliste** mit absoluten URLs und je einer erklärenden Zeile nach dem Doppelpunkt.

**Die Beschreibung nach dem Doppelpunkt ist der eigentliche Inhalt.** Eine Linkliste ohne Beschreibungen ist eine schlechtere Sitemap. Der Wert entsteht durch die kuratierte Einordnung – also genau dort, wo automatische Erfassung nicht hinkommt.

---

## Regeln

**Generieren, nicht pflegen.** Eine handgeschriebene `llms.txt` ist nach dem dritten neuen Artikel veraltet. Wenn das Projekt einen Generator für Sitemap oder Feeds hat, gehört sie in dieselbe Pipeline. Bei einem statischen Site-Generator ist das ein Script; bei Next.js eine Route unter `app/llms.txt/route.ts` mit `dynamic = 'force-static'`.

**Kuratieren, nicht vollständig auflisten.** Bei 500 Seiten gehören nicht 500 Einträge hinein. Nimm die Seiten auf, die eigenständigen Wert haben, und lass Paginierung, Tag-Übersichten und Duplikate weg. Vollständigkeit ist die Aufgabe der Sitemap.

**Als Markdown ausliefern.** `Content-Type: text/markdown; charset=utf-8`. Prüfe, dass der Pfad nicht von einer SPA-Catch-all-Route abgefangen wird – dann kommt HTML mit Status 200 zurück, und die Datei ist praktisch nicht vorhanden. Der Scan erkennt genau diesen Fall.

**Sprache benennen**, wenn die Site nicht englisch ist. Ein Modell, das eine deutsche Antwort formuliert, kann deutsche Quellen gezielt vorziehen.

**Keine Wiederholung der Navigation.** Impressum, Datenschutz und Kontakt gehören nicht in eine Datei, die inhaltliche Orientierung geben soll – außer die Site besteht im Wesentlichen daraus.

---

## Beispiel: Blog einer Einzelperson

````markdown
# Lars Decker – Product Owner & Entwickler

> Praxisberichte zu Produktmanagement, KI-Agenten in der Entwicklung und
> Automatisierung, geschrieben von einem Product Owner mit Entwickler-Background.

Autor: Lars Decker (https://lars-decker.eu/about). Sprache: Deutsch.
Alle Artikel beruhen auf eigener Projekterfahrung, nicht auf Sekundärquellen.

## Über den Autor

- [Über Lars Decker](https://lars-decker.eu/about): Laufbahn von der Backend-Entwicklung zum Product Owner, Schwerpunkte und Arbeitsweise.

## KI in der Produktentwicklung

- [Wie ein Product Owner KI-Agenten führt](https://lars-decker.eu/blog/po-fuehrt-ki-agenten): Wann Ergebnisse eines Agenten ohne Review übernehmbar sind und wann nicht.
- [Agent Harness im Vergleich](https://lars-decker.eu/blog/agent-harness-claude-code-codex-hermes-vergleich): Unterschiede zwischen Claude Code, Codex und Hermes bei Sandbox, Gedächtnis und Modellwahl.

## Planung unter Unsicherheit

- [Rolling Wave Planning in der Praxis](https://lars-decker.eu/blog/rolling-wave-planning-praxis): Wellenbasierte Planung mit ehrlichen Konfidenzhorizonten.

## Feeds

- [RSS](https://lars-decker.eu/rss.xml)
- [Sitemap](https://lars-decker.eu/sitemap.xml)
````

---

## `llms-full.txt`

Variante, die den vollständigen Textinhalt der Site in einer Datei bündelt. Sinnvoll bei Dokumentation, wo ein Modell den gesamten Bestand als Kontext braucht. Für einen Blog ist sie unnötig und erzeugt eine Datei von mehreren Megabyte, die niemand abruft.

Schlage sie nur vor, wenn es um Produktdokumentation oder eine Referenz geht.
