# Regeln für Titles, Descriptions und alt-Texte

Diese Texte sind inhaltliche Aussagen. Sie entstehen **aus** dem Seiteninhalt, nicht aus einer Vorlage mit eingesetztem Keyword.

Die Prüffrage vor jeder Formulierung: *Kann ich diese Aussage aus dem Seiteninhalt belegen?* Wenn nein, ist es keine Metadaten-Aufgabe, sondern ein Inhaltsproblem.

---

## Title

**Aufbau:** Hauptbegriff → Qualifizierer → Marke, getrennt durch `|` oder `–`.

Die erste Position ist die wertvollste. Ein Title, der mit dem Markennamen beginnt, verschenkt sie.

**Länge:** ~600 px Darstellungsbreite, näherungsweise 50–60 Zeichen. Google kürzt nach Breite, nicht nach Zeichenzahl — bei vielen Großbuchstaben passt entsprechend weniger.

### Gut

> Rolling Wave Planning in der Praxis: Wellen statt Scheingenauigkeit

Konkret, Hauptbegriff vorne, benennt die Aussage der Seite. 66 Zeichen — knapp über der Norm, aber schmale Zeichen; im Zweifel die Breite schätzen statt zu zählen.

### Schlecht

> Lars Decker | Product Owner & Entwickler | Blog | Rolling Wave Planning

Die Marke steht dreimal in Varianten, der eigentliche Inhalt landet auf der letzten Position und wird abgeschnitten. Ein solcher Title wird von Google mit hoher Wahrscheinlichkeit ersetzt — und dann ist die Arbeit wirkungslos.

### Was Google zum Umschreiben veranlasst

- Keyword-Wiederholung
- Über tausende Seiten identische Vorlage
- Reiner Markenname oder generische Bezeichnung
- Aussage, die nicht zum Inhalt passt

Der letzte Punkt ist der wichtigste: **Übereinstimmung mit dem Inhalt schlägt jede Längenregel.** Ein zu langer, aber passender Title wird gekürzt; ein passender Länge, aber unpassender Title wird ersetzt.

### Bei Vorlagen

Baue die Struktur mechanisch, aber lege die Texte vor:

```
{seitenspezifischer Titel} | {Marke}
```

Und prüfe an mindestens drei echten Beispielen, ob das Ergebnis sinnvoll ist. Eine Vorlage, die bei drei Seiten funktioniert, funktioniert meist bei allen; eine, die bei einer davon absurd klingt, produziert hunderte absurde Titles.

---

## Meta-Description

**Länge:** 150–160 Zeichen für den Desktop. **Die ersten ~120 Zeichen müssen die Kernaussage tragen** — alles danach ist auf Mobilgeräten unsichtbar.

**Realistische Erwartung:** Google ersetzt Descriptions in der Mehrheit der Suchanfragen durch Textstellen aus der Seite. Sie ist kein Rankingfaktor, sondern ein Angebot für die Klickrate. Formuliere sie entsprechend — und verkaufe sie nicht als Rankinghebel.

### Gut

> Wie ein Tech-Debt-Register aus Git-Daten entsteht: Hotspots aus Änderungshäufigkeit und Größe, übersetzt in Risiko und den kleinsten wirksamen Schritt.

Benennt konkret, was auf der Seite steht. Ein Leser weiß nach dem Lesen, ob die Seite seine Frage beantwortet.

### Schlecht

> Erfahren Sie alles über technische Schulden! Wir bieten umfassende Informationen und wertvolle Tipps rund um das Thema Tech Debt und Refactoring. Jetzt mehr lesen!

Drei Sätze ohne eine einzige überprüfbare Aussage. Steht so auf tausenden Seiten und gibt Google keinen Grund, sie der eigenen Textauswahl vorzuziehen.

### Regeln

- Ein konkreter Nutzen oder Inhalt, keine Ankündigung eines Nutzens
- Zielbegriff natürlich enthalten (Google hebt Übereinstimmungen mit der Suchanfrage hervor)
- Aktive Formulierung
- Pro Seite eigenständig; Duplikate werden ignoriert
- Keine Aussage, die die Seite nicht hält

---

## alt-Texte

**Der Unterschied, der oft verwechselt wird:**

- **Inhaltstragendes Bild:** beschreibender `alt`-Text, maximal ~125 Zeichen
- **Dekoratives Bild:** `alt=""` — leer, aber **vorhanden**

`alt=""` ist eine Aussage: „dieses Bild trägt keine Information". Ein **fehlendes** Attribut ist keine Aussage — Screenreader lesen dann häufig den Dateinamen vor.

### Gut

> `alt="Diagramm: Wellenbasierte Planung mit abnehmendem Detailgrad über drei Quartale"`

### Schlecht

> `alt="Diagramm"` — beschreibt nicht, was zu sehen ist
> `alt="rolling wave planning agile projektmanagement scrum"` — Keyword-Liste, für Screenreader-Nutzer unbrauchbar
> `alt="Bild von einem Diagramm über Planung"` — „Bild von" ist redundant, der Kontext ist bekannt

### Die harte Grenze

**Erfinde keinen `alt`-Text für ein Bild, das du nicht gesehen hast.** Wenn Dateiname, Bildunterschrift und umgebender Text den Inhalt nicht hergeben, markiere die Stelle mit einem Hinweis, statt zu raten.

Ein falscher `alt`-Text ist schlechter als keiner: Er beschreibt einem Screenreader-Nutzer etwas, das nicht da ist, und dieser Fehler ist von außen nicht erkennbar.

---

## Überschriften

**H1:** benennt das Hauptthema, stimmt mit dem Title thematisch überein, ohne wörtlich identisch zu sein.

**H2 und H3:** eigenständig verständlich. Eine Überschrift, die nur im Kontext der vorherigen Sinn ergibt, taugt weder als Sprungmarke noch als Antwort auf eine Frage.

**Nicht für Schriftgrößen verwenden.** Die Ebene beschreibt die Gliederung, die Größe gehört ins CSS.

Beim Umbau der Hierarchie: **nur die Ebene ändern, nicht den Text.** Eine H3, die zur H2 wird, behält ihre Formulierung. Wer beides gleichzeitig ändert, verliert die Nachvollziehbarkeit.

---

## Umgang mit vorhandenen Texten

**Vorhandene Titles und Descriptions nicht ohne Anlass ersetzen.** Wenn ein Title die Regeln erfüllt und zur Seite passt, ist er fertig — auch wenn du ihn anders formuliert hättest.

Ändere nur bei einem konkreten Befund: zu lang, generisch, doppelt, oder nicht zum Inhalt passend. „Könnte besser sein" ist kein Befund, sondern eine Geschmacksfrage, und über die entscheidet der Autor.

**Bei Massenänderungen:** Erst drei Beispiele vorlegen, dann ausrollen. Nicht umgekehrt.
