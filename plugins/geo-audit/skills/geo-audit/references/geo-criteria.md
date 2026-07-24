# Prüfkriterien und ihre Begründung

Für jedes Kriterium: was geprüft wird, warum es für Antwortmaschinen zählt, und wann es ausdrücklich **nicht** zählt. Der letzte Punkt ist der wichtigste – ein Audit, das jedes Kriterium überall anwendet, produziert Rauschen.

---

## 1. Zugang

### Retrieval-Crawler erreichen die Seite
**Warum:** Ohne Abruf keine Zitation. Das ist die einzige binäre Bedingung im ganzen Audit.
**Nicht relevant:** bei Seiten, die absichtlich nicht öffentlich sind.

### robots.txt verweist auf die Sitemap
**Warum:** Verlässlichster Weg, damit alle Seiten gefunden werden – nicht nur die verlinkten.
**Gewicht:** mittel. Bei kleinen, gut verlinkten Sites gering.

### Inhalt steht im serverseitigen HTML
**Warum:** Die meisten KI-Crawler führen kein JavaScript aus. Was clientseitig nachgeladen wird, existiert für sie nicht. Bei einer SPA ohne Server-Rendering ist das der eine Befund, der alle anderen dominiert.
**Prüfung:** Enthält die Roh-Antwort den Text? Bei Zweifel `curl` gegen die URL und im Ergebnis suchen.

---

## 2. Entity-Klarheit

Ein Modell muss beantworten können: *Wer sagt das, und warum ist das glaubwürdig?* Ohne Antwort auf diese Frage wird bei gleichwertigem Inhalt die bekanntere Quelle gewählt.

### Person oder Organization als Entität ausgezeichnet
**Warum:** Verankert Aussagen an einem benennbaren Absender. Für Einzelpersonen und kleine Firmen ist das der wirksamste Einzelhebel des ganzen Audits, weil er Autorität herstellt, die sonst nur über Bekanntheit entstehen würde.
**Wie:** `Person` oder `Organization` mit `name`, `url`, `sameAs` (Profile, die dieselbe Entität belegen), `jobTitle` beziehungsweise `description`.

### Entitäten über `@id` verknüpft
**Warum:** Ohne `@id` sind mehrere JSON-LD-Blöcke lose Fragmente. Mit `@id` entsteht ein Graph: diese Seite gehört zu dieser Website, verfasst von dieser Person – dieselbe Person wie auf allen anderen Seiten.
**Regel:** `@id` muss über alle Seiten hinweg **identisch** sein. Ein wechselndes `@id` erzeugt mehrere Entitäten, die niemandem ähnlich sehen.

### `sameAs` auf externe Profile
**Warum:** Verbindet die Entität mit Belegen außerhalb der eigenen Domain. Eine Selbstaussage wiegt weniger als eine Selbstaussage mit externen Ankern.

### `lang`-Attribut gesetzt
**Warum:** Bei mehrsprachigen Antworten entscheidet die Sprachzuordnung, ob die Quelle überhaupt in Betracht kommt.

### JSON-LD ist parsebar
**Warum:** Ein Syntaxfehler führt dazu, dass der **gesamte** Block ignoriert wird – nicht nur das fehlerhafte Feld. Deshalb `kritisch`, nicht `hinweis`.

---

## 3. Zitierfähigkeit

Der Teil, der in klassischen SEO-Audits fehlt, und der Teil mit dem größten Verbesserungspotenzial bei gut gepflegten Sites.

### Absätze funktionieren ohne Vorgänger
**Warum:** Ein Modell übernimmt Ausschnitte. Ein Absatz, der mit „Das bedeutet, dass …" beginnt, ist isoliert wertlos: das Bezugswort fehlt.
**Messung:** Anteil der Sätze, die mit einem Rückverweis beginnen (`Das`, `Dies`, `Er`, `Sie`, `Dabei`, `Deshalb`, `It`, `This`, `They` …). Über 30 % ist ein Befund.
**Nicht überinterpretieren:** Rückverweise sind gutes Deutsch und machen Text lesbar. Es geht nicht um Vermeidung, sondern darum, dass **die zentralen Aussagen** eigenständig stehen. Wenn du das nicht so formulierst, entsteht eine Empfehlung, die den Text schlechter macht.

### Sätze sind als Ganzes übernehmbar
**Warum:** Ein 60-Wort-Satz mit drei Einschüben wird gekürzt oder verworfen. Kurze, vollständige Aussagen werden wörtlich übernommen.
**Messung:** Anteil der Sätze über 35 Wörter. Über 25 % ist ein Befund.
**Nicht anwenden** auf Übersichtsseiten: Teaser-Fragmente ohne Satzzeichen verschmelzen bei der Segmentierung zu Riesensätzen. Der Scan erkennt diese Seiten und wendet das Kriterium dort nicht an.

### Die Antwort steht vorne
**Warum:** Der erste Absatz nach der H1 ist die häufigste Zitatquelle. Steht dort eine Hinführung statt einer Aussage, wird die Seite seltener herangezogen.
**Zielkonflikt, den du benennen musst:** Gute Texte bauen Spannung auf. Zitierfähige Texte liefern die Aussage zuerst. Das ist eine Stilentscheidung des Autors, keine Fehlerkorrektur – biete den Hinweis an, überschreibe nicht den Ton.

### Überprüfbare Substanz
**Warum:** Zahlen, Versionen, benannte Werkzeuge und explizite Grenzen machen Inhalt unterscheidbar. Bei Austauschbarkeit gewinnt die etabliertere Quelle.
**Messung im Scan:** Anteil der Sätze mit Zahl – ein schwaches Signal, das nur zusammen mit dem Leseeindruck etwas wert ist. Verwende es nicht allein als Befund.

### Externe Quellen verlinkt
**Warum:** Belegte Aussagen werden als verlässlicher eingeordnet. Ein Fachartikel ohne einen einzigen Außenverweis wirkt wie eine geschlossene Behauptung.
**Nicht relevant** bei Erfahrungsberichten in der ersten Person – dort ist die Erfahrung selbst die Quelle. Wende das Kriterium nicht mechanisch an.

---

## 4. Struktur

### Überschriften im Frageformat
**Warum:** Nutzerfragen sind Fragen. Eine Überschrift, die die Frage wörtlich enthält, ist der direkteste Treffer, den ein Abschnitt liefern kann.
**Wie:** Zwei bis drei Abschnitte pro Seite als Frage, die tatsächlich gestellt wird – nicht als künstliche Umformung jeder Überschrift.

### Listen und Tabellen
**Warum:** Strukturierte Blöcke sind maschinell zuverlässig extrahierbar. Ein Vergleich als Tabelle wird eher übernommen als derselbe Vergleich als Fließtext.
**Nicht übertreiben:** Fließtext in Listen zu zerhacken macht Inhalt schlechter. Das Kriterium gilt für Inhalte, die **ihrer Natur nach** Aufzählung oder Vergleich sind.

### Eine H1, saubere Hierarchie
**Warum:** Mehrere H1 machen das Hauptthema uneindeutig. Übersprungene Ebenen erschweren die Zuordnung von Abschnitten zum Thema.

### FAQPage-Strukturdaten
**Warum:** Explizite Frage-Antwort-Paare sind das direkteste maschinenlesbare Format.
**Bedingung:** Nur wenn die Fragen auch sichtbar auf der Seite stehen. Strukturdaten für nicht vorhandene Inhalte sind ein Verstoß gegen die Richtlinien der Suchmaschinen und werden abgestraft – schlage das nie als Trick vor.

---

## 5. Aktualität

### `dateModified` in den Strukturdaten
**Warum:** Bei zeitabhängigen Fragen bevorzugen Antwortmaschinen aktuelle Quellen.
**Bedingung:** Das Datum muss echt sein. Ein `dateModified`, das bei jedem Deployment ohne inhaltliche Änderung hochgesetzt wird, ist ein Manipulationsversuch. Wenn du das im Code siehst, weise darauf hin.
**Nicht relevant** auf zeitlosen Seiten wie Impressum oder Kontakt.

### Sichtbares Datum
**Warum:** Was nur in Strukturdaten steht, sieht ein Leser nicht – und ein Modell, das die Seite als Text verarbeitet, ebenfalls nicht zuverlässig.

---

## 6. Auffindbarkeit

### llms.txt
**Warum:** Vorgeschlagenes Format, das Inhalte für Sprachmodelle kuratiert zusammenfasst.
**Ehrliche Einordnung:** Die Auswertung ist von den großen Anbietern nicht öffentlich zugesichert. Der Aufwand ist gering, der Nachweis für Wirkung fehlt. Empfehle sie als billige Maßnahme, nicht als Hebel – und nie als Erklärung für ausbleibende Sichtbarkeit.

### Sitemap vorhanden und aktuell
**Warum:** Grundlage für vollständige Erfassung.

### Canonical gesetzt
**Warum:** Verhindert, dass dieselbe Aussage auf mehrere URLs verteilt wird und keine davon als Quelle gewählt wird.

---

## Nicht Teil dieses Audits

- **Ladezeit und Core Web Vitals.** Für klassisches Ranking relevant, für die Auswahl als Zitatquelle nach heutigem Kenntnisstand nicht. Verweise auf ein Performance-Werkzeug, statt beides zu vermischen.
- **Keyword-Dichte und -Platzierung.** Antwortmaschinen arbeiten semantisch. Keyword-Optimierung ist hier gegenstandslos.
- **Backlink-Profil.** Relevant für Autorität, aber von außen nicht sinnvoll prüfbar und nicht Gegenstand dieses Scans.
- **Inhaltliche Richtigkeit.** Der Audit prüft Form, nicht Wahrheit. Ein gut strukturierter falscher Artikel besteht diesen Audit – sage das, wenn der Kontext es erfordert.
