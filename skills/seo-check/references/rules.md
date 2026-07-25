# Regelwerk mit Schwellwerten

Jede Regel mit Schwellwert, Begründung und der Angabe, wann sie **nicht** gilt. Der letzte Punkt entscheidet über die Qualität des Berichts: eine Regel, die überall gleich angewandt wird, produziert Falschbefunde.

Einstufungen: **Fehler** verhindert oder beschädigt Indexierung. **Warnung** verringert Wirkung messbar. **Hinweis** ist Feinschliff.

---

## 1. Title

| Regel | Wert | Stufe |
| :-- | :-- | :-- |
| Genau ein `<title>` im `<head>` | 1 | Fehler bei 0 oder >1 |
| Darstellungsbreite | ~600 px Budget | Warnung bei Überschreitung |
| Zeichenzahl als Näherung | 50–60 | Warnung unter 30 |
| Eindeutig pro indexierbarer URL | — | Fehler bei Duplikat |
| Hauptbegriff vorne, Marke hinten | — | manuell |

**Warum Pixel und nicht Zeichen:** Google kürzt nach Darstellungsbreite. „Willkommen bei Wilhelm Wagner Wohnmöbel" und „iliili iliili iliili iliili" haben dieselbe Zeichenzahl und völlig verschiedene Breite. Das Script schätzt die Breite über Zeichengewichte; das ist genauer als Zählen, aber keine echte Textmessung.

**Aufbau, der funktioniert:** Hauptbegriff → Qualifizierer → Marke, getrennt durch `|` oder `–`. Die erste Position ist die wertvollste; ein Title, der mit dem Markennamen beginnt, verschenkt sie.

**Was Google zum Umschreiben veranlasst:** Keyword-Wiederholung, quer über tausende Seiten identische Vorlagen, reiner Markenname, und eine Aussage, die nicht zum Seiteninhalt passt. Ein umgeschriebener Title macht die Optimierung wirkungslos — deshalb ist Übereinstimmung mit dem Inhalt wichtiger als jede Längenregel.

**Gilt nicht für:** Rechtstexte und Funktionsseiten. „Impressum" ist ein korrekter Title.

---

## 2. Meta-Description

| Regel | Wert | Stufe |
| :-- | :-- | :-- |
| Genau ein Tag | 1 | Fehler bei >1 |
| Länge Desktop | 150–160 Zeichen (~920 px) | Warnung über 160 |
| Sichtbar auf Mobil | erste ~120 Zeichen (~680 px) | — |
| Zu kurz | unter 120 Zeichen | Hinweis |
| Eindeutig pro Seite | — | Warnung bei Duplikat |

**Realistische Erwartung:** Google ersetzt Descriptions in der Mehrheit der Suchanfragen durch Textstellen aus der Seite, wenn diese besser zur Anfrage passen. Die Description ist deshalb kein Rankingfaktor, sondern ein Angebot für die Klickrate. Formuliere den Befund entsprechend — wer sie als Rankinghebel verkauft, verspricht etwas Falsches.

**Wichtigste Konsequenz daraus:** Die ersten 120 Zeichen müssen die Kernaussage tragen. Alles danach ist mobil unsichtbar.

**Gilt nicht für:** Seiten ohne Suchpotenzial. Auf 2.000 Filterseiten eine eigene Description zu schreiben ist Aufwand ohne Gegenwert.

---

## 3. Canonical

| Regel | Stufe |
| :-- | :-- |
| Absolute URL mit Protokoll und Host | Fehler bei relativ |
| Kleinschreibung | Warnung |
| Genau ein Canonical (mehrere mit verschiedenen Zielen werden **beide** ignoriert) | Fehler |
| Ziel liefert 200 | Fehler bei 3xx, 4xx, 5xx |
| Ziel leitet nicht weiter | Fehler |
| Selbstreferenz auf Hauptseiten | Warnung wenn fehlt |
| Nicht gleichzeitig mit `noindex` | Warnung |

**Warum Canonical und noindex sich widersprechen:** Canonical sagt „bewerte stattdessen jene URL", noindex sagt „nimm diese Seite gar nicht auf". Die Signale schließen sich aus. Entscheide dich für eines.

**Paginierung nicht auf Seite 1 kanonisieren.** Das ist ein verbreiteter Fehler mit unangenehmer Folge: Der Crawler verfolgt die tieferen Seiten nicht mehr, und alle nur dort verlinkten Inhalte werden unsichtbar. Paginierte Seiten kanonisieren auf sich selbst.

**Legitim:** Domainübergreifende Canonicals bei Syndication — der Zweitabdruck verweist auf das Original.

---

## 4. Robots-Direktiven

Gültig: `index`, `noindex`, `follow`, `nofollow`, `none`, `all`, `noarchive`, `nosnippet`, `notranslate`, `noimageindex`, `max-snippet:[n]`, `max-image-preview:[none|standard|large]`.

**Vorrangregel:** Der HTTP-Header `X-Robots-Tag` überschreibt das Meta-Tag im `<head>`. Ein `<meta name="robots" content="index">` bei gleichzeitigem `X-Robots-Tag: noindex` führt dazu, dass die Seite **nicht** indexiert wird. Bei widersprüchlichen Angaben folgt Google im Zweifel der restriktivsten.

Wenn eine Seite unerklärlich fehlt und das Meta-Tag sauber aussieht: **immer die Response-Header prüfen.** Das ist die häufigste Ursache für „ich finde den Fehler nicht".

**`X-Robots-Tag` ist das Mittel für Nicht-HTML-Dateien** — PDFs, Videos, Bilder. Ein Meta-Tag gibt es dort nicht.

### Die fatale Kombination

`noindex` **und** Sperre in der robots.txt gleichzeitig: Der Crawler darf die Seite nicht abrufen, liest deshalb die `noindex`-Direktive nie und kann die Seite als reinen URL-Treffer dauerhaft im Index halten. Der Ausschluss wird durch die Sperre also verhindert.

Richtig ist: Crawling **erlauben**, `noindex` setzen, warten bis die Seite verschwunden ist. Erst danach darf gesperrt werden.

Dasselbe gilt für `X-Robots-Tag`: Ein gesperrter Pfad liefert keine Header, die gelesen werden.

**`noindex` nie auf Paginierung.** Blockiert die Entdeckung tieferer Inhalte.

---

## 5. Überschriftenstruktur

| Regel | Wert | Stufe |
| :-- | :-- | :-- |
| Genau eine H1 | 1 | Fehler bei 0, Warnung bei >1 |
| Keine Ebenensprünge nach unten | H1→H3 unzulässig | Warnung |
| Zurücksprünge nach oben | erlaubt | — |
| Keine leeren Überschriften-Tags | — | Warnung |
| Überschriften eindeutig | — | Hinweis |

Sprünge nach oben sind korrekt und signalisieren einen neuen Abschnitt. Nur der Sprung nach unten bricht die Hierarchie.

**Häufigste Ursache für Verstöße:** Überschriftenebenen werden zur Schriftgrößensteuerung benutzt. Größe gehört ins CSS, die Ebene beschreibt die Gliederung.

Die meisten Seiten brauchen nur H1 bis H3. Mehr Ebenen sind meist ein Zeichen dafür, dass die Seite in mehrere hätte geteilt werden sollen.

---

## 6. robots.txt

| Regel | Wert |
| :-- | :-- |
| Ort | ausschließlich `/robots.txt` im Wurzelverzeichnis |
| Dateiname | kleingeschrieben, exakt |
| Kodierung | UTF-8 |
| Größe | maximal 500 KB, darüber ignoriert Google den Rest |
| Sitemap-Verweis | absolute URL, empfohlen |

**Gruppenisolierung — die am häufigsten missverstandene Regel:** Ein Crawler wertet **nur** die für ihn spezifischste Gruppe aus. Findet er eine Gruppe mit seinem Namen, ignoriert er `User-agent: *` vollständig. Regeln aus mehreren Gruppen werden nicht kombiniert. Wer allgemeine Regeln unter `*` pflegt und daneben eine Spezialgruppe anlegt, verliert für diesen Bot alle allgemeinen Regeln.

**Longest match gewinnt** bei Googlebot: die Regel mit dem längsten übereinstimmenden Pfad, unabhängig von der Reihenfolge.

**Groß- und Kleinschreibung ist relevant:** `/Admin/` und `/admin/` sind verschiedene Pfade.

**`Disallow:` ohne Wert bedeutet „alles erlaubt"**, nicht „nichts erlaubt". `Disallow: /` sperrt die gesamte Site.

**Wildcards** `*` und `$` unterstützen Googlebot und Bingbot; andere Crawler nicht zwingend.

**robots.txt verhindert kein Indexieren.** Sie verhindert Crawling. Eine gesperrte, aber extern verlinkte Seite kann als URL-Treffer im Index landen. Zum Ausschluss dient `noindex`.

**Nie JavaScript oder CSS sperren.** Google kann die Seite dann nicht rendern und bewertet sie als defekt.

---

## 7. XML-Sitemap

| Regel | Wert |
| :-- | :-- |
| URLs pro Datei | maximal 50.000 |
| Größe pro Datei | maximal 50 MB unkomprimiert |
| Kodierung | UTF-8 |
| `<loc>` | Pflicht, absolute URL mit Protokoll |
| `<lastmod>` | empfohlen, W3C-Datetime, mindestens `YYYY-MM-DD` |
| `<changefreq>`, `<priority>` | werden von Google ignoriert |

Bei Überschreitung: aufteilen und eine Sitemap-Index-Datei anlegen.

**Was nie in eine Sitemap gehört:** URLs mit 404, 410, 301 oder 302; Seiten mit `noindex`; per robots.txt gesperrte URLs; nicht-kanonische Varianten; Paginierung und Parameter-URLs.

Die Sitemap ist eine Aussage: „das sind meine indexierbaren Seiten". Jeder Eintrag, der dieser Aussage widerspricht, senkt das Vertrauen in die gesamte Datei. Ein Widerspruch zwischen Sitemap und robots.txt ist deshalb ein Fehler, nicht eine Warnung.

**`<lastmod>` muss echt sein.** Google steuert damit die Neu-Crawl-Frequenz. Ein Datum, das bei jedem Deployment ohne inhaltliche Änderung hochgesetzt wird, entwertet das Signal — und wenn du das im Code siehst, weise darauf hin.

---

## 8. Rendering

**Muss in der Server-Antwort stehen:** Title, Meta-Description, Canonical, JSON-LD, H1, der Haupttext und die interne Navigation als echte `<a href>`-Elemente.

**Warum das strenger ist als „Google kann JavaScript":** Googlebot arbeitet in drei Stufen — crawlen, rendern, indexieren. Die Renderstufe ist eine Warteschlange mit Budget; JavaScript-lastige Seiten werden verzögert oder unvollständig verarbeitet. Und Googlebot ist die Ausnahme: Bing, Social-Scraper und KI-Crawler führen in der Regel überhaupt kein JavaScript aus. Was per JavaScript entsteht, existiert für sie nicht.

| Verfahren | SEO-Eignung |
| :-- | :-- |
| SSG (statisch generiert) | am besten |
| SSR (serverseitig gerendert) | gut, sicherer Standard |
| ISR (statisch mit Regeneration) | gut |
| CSR (clientseitig) | riskant für alles Indexierbare |

**Dynamic Rendering** — Bot-Erkennung mit vorgerenderten Kopien — ist von Google für veraltet erklärt. Nicht mehr empfehlen.

**Erkennung:** Quelltext gegen gerenderte DOM vergleichen; JavaScript deaktivieren; die URL-Prüfung der Search Console nutzen. Das Script prüft Textmenge und leere Mount-Container in der Server-Antwort.

**Navigation über Klick-Handler statt `<a href>`** ist ein eigener Befund: Der Crawler findet die Ziele nicht, egal wie gut die Zielseiten sind.

---

## 9. URLs und Statuscodes

| Regel | Wert |
| :-- | :-- |
| Protokoll | HTTPS, bestätigter Rankingfaktor |
| Schreibweise | durchgehend klein |
| Worttrenner | Bindestrich, nicht Unterstrich |
| Zeichen | keine Leer- und Sonderzeichen |
| Tiefe | wichtige Seiten in maximal 3–4 Ebenen |
| Trailing Slash | eine Variante festlegen, andere per 301 |
| Füllwörter | vermeiden |

### Statuscodes

| Code | Bedeutung | Behandlung |
| :-- | :-- | :-- |
| 200 | in Ordnung | Zielzustand |
| 301 | permanent verschoben | überträgt nahezu alle Signale |
| 302 | temporär | Original bleibt im Index; nie für dauerhafte Umzüge |
| 304 | nicht geändert | schont Crawl-Budget |
| 404 | nicht gefunden | in kleiner Zahl normal |
| 410 | dauerhaft entfernt | schnellere Deindexierung als 404 |
| 5xx | Serverfehler | Google verlangsamt das Crawling; dauerhaft droht Indexverlust |

**Soft 404** — Status 200 mit „nicht gefunden"-Inhalt — ist schlechter als ein echter 404: Der Crawler verschwendet Budget und der Index füllt sich mit wertlosen Einträgen.

**Weiterleitungsketten** vermeiden: immer direkt auf das Endziel. Ketten verwässern Signale und verlangsamen das Crawling. Interne Links nie auf weiterleitende URLs setzen — das ist vermeidbarer Verlust im eigenen Haus.

---

## 10. Bilder

| Regel | Wert | Stufe |
| :-- | :-- | :-- |
| `alt` bei inhaltstragenden Bildern | vorhanden und beschreibend | Fehler wenn fehlt |
| `alt` bei dekorativen Bildern | `alt=""`, leer aber vorhanden | — |
| `alt`-Länge | maximal ~125 Zeichen | Hinweis |
| `width` und `height` | immer explizit | Warnung |
| Dateigröße | meist unter 300 KB | Warnung |
| Format | WebP (25–35 % kleiner als JPEG), AVIF (~50 %, mit Fallback) | Hinweis |
| `loading="lazy"` | nur unterhalb der Falz | Warnung bei Hero-Bild |
| `srcset` und `sizes` | für responsive Auslieferung | Hinweis |
| Dateiname | klein, Bindestriche, sprechend | Hinweis |

**Unterschied zwischen fehlendem und leerem `alt`:** `alt=""` ist eine Aussage („dieses Bild trägt keine Information") und für Screenreader korrekt. Ein fehlendes Attribut ist keine Aussage — der Screenreader liest dann oft den Dateinamen vor.

**`width`/`height` sind primär eine CLS-Maßnahme:** Ohne sie kennt der Browser die Bildabmessungen erst nach dem Laden und verschiebt das Layout. Das ist die häufigste Einzelursache für einen schlechten CLS-Wert.

**Hero-Bilder nie lazy laden.** Das verzögert genau das Element, das den LCP bestimmt.

---

## 11. Links

| Regel | Stufe |
| :-- | :-- |
| Ankertext beschreibt das Ziel | Warnung bei „hier klicken", „mehr lesen" |
| Kein leerer Ankertext | Warnung |
| `rel="sponsored"` bei bezahlten Links | Fehler wenn fehlt |
| `rel="ugc"` bei nutzergenerierten Inhalten | Warnung |
| `rel="noopener"` bei `target="_blank"` | Hinweis |
| Interne Links zeigen auf 200-URLs | Fehler bei 4xx, Warnung bei 3xx |
| Keine Weiterleitungsketten und -schleifen | Fehler bei Schleife |
| Wichtige Seiten in 3–4 Klicks erreichbar | Warnung |
| Keine verwaisten Seiten | Warnung |

`rel="nofollow"`, `sponsored` und `ugc` sind seit 2020 Hinweise, keine Anweisungen: Google kann die Ziele trotzdem crawlen. Formuliere sie deshalb nicht als Zugriffsschutz.

Externe Links auf gute Quellen „verlieren" keine Rankings. Diese Sorge ist verbreitet und falsch — sie führt zu Inhalten ohne Belege, was für Antwortmaschinen zusätzlich schädlich ist.

Links im Fließtext wirken stärker als Links in Footer oder Sidebar.

---

## 12. hreflang

| Regel | Stufe |
| :-- | :-- |
| Sprachcode ISO 639-1, zwei Kleinbuchstaben | Fehler |
| Optionaler Regionscode ISO 3166-1 Alpha-2 nach Bindestrich | Fehler bei Unterstrich |
| Sprache zuerst; Region allein ist unzulässig | Fehler |
| Absolute URLs | Fehler |
| Selbstreferenz auf jeder Seite | Fehler wenn fehlt |
| Reziprozität: A→B verlangt B→A | Fehler |
| `x-default` als Fallback | Hinweis |
| Nur auf kanonische, indexierbare URLs zeigen | Fehler |
| `lang`-Attribut am `<html>`-Element | Warnung |

**Reziprozität ist die kritischste Regel:** Fehlt der Rückverweis, ignoriert Google die **gesamte** hreflang-Gruppe — nicht nur den einen Verweis. Ein fehlender Rückverweis kann also die komplette internationale Auszeichnung entwerten.

**Häufige Fehler:** `uk` statt `gb` für Großbritannien (`uk` ist der Code für Ukrainisch als Sprache, nicht für das Vereinigte Königreich als Land). `en-eu` — Europa ist kein ISO-3166-1-Land. `en_US` mit Unterstrich statt Bindestrich.

---

## 13. Open Graph und Twitter Cards

| Eigenschaft | Status |
| :-- | :-- |
| `og:title`, `og:type`, `og:image`, `og:url` | Pflicht |
| `og:description`, `og:site_name`, `og:locale`, `og:image:alt` | empfohlen |
| `twitter:card` | Pflicht, wenn Twitter-Tags genutzt werden |

| Bild | Wert |
| :-- | :-- |
| Empfohlen | 1200 × 630 px (1,91:1) |
| Minimum | 600 × 315 px |
| Absolutes Minimum | 300 px je Seite, darunter Thumbnail-Darstellung |
| Dateigröße | unter 5 MB |
| URL | absolut, HTTPS; relative Pfade werden abgelehnt |

**Attributfalle:** Open-Graph-Tags nutzen `property=`, Twitter-Tags nutzen `name=`. Verwechslung führt dazu, dass die Tags ignoriert werden — und sie ist im Quelltext kaum zu sehen. Das Script prüft es.

**Plattformen cachen Vorschauen tage- bis wochenlang.** Nach einer Korrektur muss der Cache aktiv erneuert werden (Facebook Sharing Debugger, LinkedIn Post Inspector), sonst bleibt die alte Vorschau sichtbar und der Fix wirkt nicht.

**Ein nicht erreichbares `og:image` betrifft die gesamte Site**, wenn alle Seiten dasselbe Bild referenzieren. Das ist ein Einzelfehler mit maximaler Reichweite — entsprechend hoch einstufen.

---

## 14. Strukturierte Daten

Siehe `structured-data.md` für Pflichtfelder je Typ.

Grundregeln:

- **JSON-LD in einem `<script type="application/ld+json">`-Block**, im `<head>` oder `<body>`.
- **Syntax streng:** doppelte Anführungszeichen, keine nachgestellten Kommata. Ein Syntaxfehler entwertet den **gesamten** Block, nicht nur das fehlerhafte Feld. Deshalb Fehler, nicht Warnung.
- **Entitäten verschachteln, nicht als Zeichenkette:** `author` als `Person`- oder `Organization`-Objekt.
- **`@id` für Entitäten, die auf mehreren Seiten vorkommen** — über alle Seiten identisch.

### Richtlinienverstöße mit Sanktionsrisiko

Das ist der einzige Bereich dieses Regelwerks, in dem ein Fehler nicht nur Wirkung kostet, sondern eine manuelle Maßnahme auslösen kann:

- Markup für Inhalte, die auf der Seite nicht sichtbar sind
- Bewertungen oder Sternewertungen ohne echte, sichtbare Rezensionen
- Strukturierte Daten, die dem tatsächlichen Seiteninhalt widersprechen

Wenn du so etwas findest, ist es der schwerste Befund des Berichts. Und schlage es niemals als Trick vor, auch nicht auf Nachfrage.

---

## 15. Core Web Vitals

| Metrik | Gut | Verbesserungsbedarf | Schlecht |
| :-- | :-- | :-- | :-- |
| LCP (Largest Contentful Paint) | ≤ 2,5 s | 2,5–4,0 s | > 4,0 s |
| INP (Interaction to Next Paint) | ≤ 200 ms | 200–500 ms | > 500 ms |
| CLS (Cumulative Layout Shift) | ≤ 0,1 | 0,1–0,25 | > 0,25 |

INP hat im März 2024 FID ersetzt.

**Nicht mit diesem Script messbar.** Es braucht einen echten Browser (Lighthouse, PageSpeed Insights) oder Felddaten aus der Search Console. Felddaten schlagen Labordaten, weil sie echte Geräte und Verbindungen abbilden.

Bekannte Auslöser, die das Script erkennt: fehlende Bildabmessungen (CLS), lazy geladene Hero-Bilder (LCP), sehr große Bilddateien (LCP), hohe Script-Anzahl (INP).

Übliche Gegenmaßnahmen: LCP über Bildformate, Vorladen des Hero-Bildes, weniger blockierendes CSS/JS und TTFB-Reduktion. INP über kürzere Hauptthread-Aufgaben und weniger Drittanbieter-Skripte. CLS über explizite Abmessungen, reservierten Platz für Werbung und stabiles Font-Loading.

---

## 16. Inhalt und Lesbarkeit

**Keine Wortzahl-Schwelle.** Die Länge soll der Suchintention entsprechen. Vollständigkeit schlägt Länge: abgedeckt sein müssen die naheliegenden Unterfragen, nicht eine Zielmarke.

| Kennzahl | Zielbereich |
| :-- | :-- |
| Wörter pro Satz | 15–20 im Schnitt |
| Sätze pro Absatz | 2–4 |
| Flesch Reading Ease (Englisch) | 60–70 |

**Der Flesch-Zielbereich 60–70 gilt für englischen Text.** Für Deutsch nutzt das Script die Amstad-Variante (`180 − ASL − 58,5 × ASW`); deutsche Fachtexte landen dort regelmäßig bei 30–50, ohne dass daran etwas zu verbessern wäre. Deutsche Komposita drücken den Wert strukturell. Bewerte relativ zu vergleichbaren Seiten, nie gegen den englischen Zielwert — sonst entsteht ein Befund, der zu schlechterem Text führt.

Das Script meldet Lesbarkeit nur auf Seiten mit mindestens 300 Wörtern. Auf Übersichts-, Navigations- und Rechtsseiten misst die Satzsegmentierung Fragmente, und ein Befund hätte ohnehin keine Handlungsoption.

**Thin Content** — wenige Sätze, die ein Thema kaum berühren — ist ein Qualitätssignal nach unten. Das ist eine inhaltliche Bewertung und keine Messung; sie gehört zur manuellen Durchsicht.
