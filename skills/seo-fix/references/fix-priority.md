# Reihenfolge nach Wirkung

Die Reihenfolge ist keine Geschmacksfrage: jede Stufe ist Voraussetzung für die nächste. Ein perfekter Title auf einer nicht indexierbaren Seite hat exakt null Wirkung.

Pro Eintrag steht dabei, ob er **mechanisch** umsetzbar ist oder eine **Entscheidung** braucht.

---

## Stufe 1 — Indexierbarkeit

Ohne diese Stufe ist alles darunter wirkungslos.

| Befund | Umsetzung | Art |
| :-- | :-- | :-- |
| Versehentliches `noindex` | Direktive entfernen — **nur nach Rückfrage** | Entscheidung |
| `noindex` **und** robots.txt-Sperre gleichzeitig | Sperre entfernen, damit die Direktive gelesen werden kann | mechanisch |
| `X-Robots-Tag: noindex` im Header | Server- oder Middleware-Konfiguration korrigieren | Entscheidung |
| Canonical zeigt auf 404 oder Weiterleitung | Ziel auf die 200-URL korrigieren | mechanisch |
| Canonical relativ statt absolut | absolute URL erzeugen | mechanisch |
| Mehrere widersprüchliche Canonicals | auf eines reduzieren | mechanisch |
| 5xx auf indexierbaren Seiten | Ursache beheben | Entscheidung |
| `og:image` liefert Fehler und wird site-weit referenziert | Bild reparieren oder ersetzen | mechanisch |
| Seiten mit 4xx in der Sitemap | Sitemap-Generierung filtern | mechanisch |

**Warum `og:image` in Stufe 1 steht, obwohl es kein Rankingfaktor ist:** Wenn alle Seiten dasselbe Bild referenzieren und dieses Bild nicht ausgeliefert wird, ist jede geteilte Vorschau der gesamten Site defekt. Ein einzelner Fix mit maximaler Reichweite gehört nach vorne, unabhängig von der Kategorie.

**Reihenfolge beim `noindex`-Ausbau:** Erst Crawling erlauben, dann `noindex` entfernen. Umgekehrt liest der Crawler die Änderung nicht.

---

## Stufe 2 — Sichtbarkeit für Crawler

| Befund | Umsetzung | Art |
| :-- | :-- | :-- |
| Inhalt entsteht erst clientseitig | Seite auf SSR oder SSG umstellen | Entscheidung |
| Metadaten per JavaScript gesetzt | serverseitig setzen | mechanisch |
| Navigation über Klick-Handler statt `<a href>` | echte Links einsetzen | mechanisch |
| JS- oder CSS-Dateien in robots.txt gesperrt | Sperre entfernen | mechanisch |
| Soft 404 (Status 200 bei Fehlerseite) | echten 404 zurückgeben | mechanisch |

Der Umbau von CSR auf SSR ist der größte Eingriff in dieser Liste und keine Nebenbei-Änderung. Benenne den Aufwand ehrlich, statt ihn als Metadaten-Fix zu tarnen. Häufig genügt es, **einzelne Seitentypen** umzustellen — die inhaltlichen — statt der ganzen Anwendung.

Ein Soft 404 in einer SPA ist mechanisch, aber leicht zu übersehen: die Fehlerkomponente wird gerendert, der Statuscode bleibt 200. In Next.js löst `notFound()` das korrekt.

---

## Stufe 3 — Verständnis

| Befund | Umsetzung | Art |
| :-- | :-- | :-- |
| Title fehlt | aus H1 und Inhalt formulieren | Entscheidung |
| Title zu lang oder zu breit | kürzen, Hauptaussage nach vorne | Entscheidung |
| Title generisch oder doppelt | pro Seite eindeutig formulieren | Entscheidung |
| Title-Vorlage über viele Seiten identisch | Vorlage um seitenspezifische Variable erweitern | mechanisch |
| Description fehlt, zu lang oder doppelt | formulieren beziehungsweise kürzen | Entscheidung |
| H1 fehlt oder mehrfach vorhanden | eine H1 setzen, weitere zu H2 | mechanisch |
| Übersprungene Überschriftenebenen | Ebenen korrigieren, Größe über CSS | mechanisch |
| Leere Überschriften-Tags | entfernen | mechanisch |
| JSON-LD nicht parsebar | Syntax korrigieren | mechanisch |
| JSON-LD Pflichtfelder fehlen | ergänzen, sofern die Daten vorhanden sind | mechanisch |
| `author` als Zeichenkette | in verschachteltes Objekt mit `@id` umbauen | mechanisch |
| `lang`-Attribut fehlt | setzen | mechanisch |

Die Title- und Description-Zeilen sind als Entscheidung markiert, weil sie inhaltliche Aussagen sind. Der **Mechanismus** dahinter — eine Vorlage, die den Seitentitel einsetzt — ist dagegen mechanisch und darf ohne Rückfrage gebaut werden. Trenne beides: Struktur bauen, Texte vorlegen.

---

## Stufe 4 — Verlinkung und Entdeckbarkeit

| Befund | Umsetzung | Art |
| :-- | :-- | :-- |
| Interne Links auf 4xx | Ziel korrigieren oder Link entfernen | mechanisch |
| Interne Links auf Weiterleitungen | direkt auf die 200-URL verlinken | mechanisch |
| Weiterleitungsketten | auf einen Sprung reduzieren | Entscheidung bei Live-Traffic |
| Sitemap fehlt | in die Build-Pipeline aufnehmen | mechanisch |
| Sitemap enthält nicht-indexierbare URLs | Generierung filtern | mechanisch |
| `<lastmod>` fehlt | aus echten Änderungsdaten füllen | mechanisch |
| Kein Sitemap-Verweis in robots.txt | Zeile ergänzen | mechanisch |
| Generische Ankertexte | beschreibend umformulieren | Entscheidung |
| Verwaiste Seiten | von passender Stelle verlinken | Entscheidung |
| hreflang-Syntaxfehler | Codes korrigieren | mechanisch |
| Fehlende hreflang-Reziprozität | Rückverweise ergänzen | mechanisch |

**`<lastmod>` niemals aus dem Build-Zeitpunkt füllen.** Es muss eine inhaltliche Änderung abbilden. Bei dateibasierten Inhalten ist das Frontmatter-Feld oder das Git-Datum der letzten inhaltlichen Änderung die richtige Quelle.

---

## Stufe 5 — Feinschliff

| Befund | Umsetzung | Art |
| :-- | :-- | :-- |
| `alt` fehlt | ergänzen, dekorative Bilder `alt=""` | Entscheidung bei unbekanntem Bildinhalt |
| `width`/`height` fehlen | ergänzen — wirkt direkt auf CLS | mechanisch |
| Hero-Bild lazy geladen | `loading="lazy"` entfernen | mechanisch |
| Bilder über 300 KB | komprimieren, verkleinern | mechanisch |
| JPEG/PNG statt WebP oder AVIF | Format umstellen, sofern die Pipeline es kann | Entscheidung |
| Open-Graph-Pflichtfelder fehlen | ergänzen | mechanisch |
| `property=` und `name=` verwechselt | korrigieren | mechanisch |
| `twitter:card` fehlt | ergänzen | mechanisch |
| URL mit Großbuchstaben oder Unterstrichen | umstellen **plus 301** | Entscheidung |
| Füllwörter im Slug | nur bei neuen Seiten ändern | Entscheidung |
| `rel="noopener"` fehlt | ergänzen | mechanisch |

**URLs bestehender Seiten nicht ohne Not ändern.** Jede Änderung braucht eine 301, entwertet externe Links leicht und kostet vorübergehend Sichtbarkeit. Bei Neuanlagen richtig machen, bei bestehenden nur, wenn ein konkreter Grund dafür spricht. Ein Unterstrich im Slug ist kein solcher Grund.

`width`/`height` sind in dieser Stufe der Eintrag mit dem besten Verhältnis von Aufwand zu Wirkung: mechanisch, risikofrei, und direkt auf eine Metrik wirkend, die Google auswertet.

---

## Was bewusst nicht in dieser Liste steht

- **Keyword-Dichte, Keyword-Platzierung.** Kein Wirkungsmechanismus.
- **Meta-Keywords.** Seit über einem Jahrzehnt ohne Funktion.
- **`changefreq` und `priority` in der Sitemap.** Google ignoriert beide.
- **Dynamic Rendering.** Von Google für veraltet erklärt.
- **Textmenge als Zielwert.** Es gibt keinen Wortzahl-Schwellwert.
- **SEO-Punktzahlen.** Suggerieren Genauigkeit, die nicht existiert, und verschieben die Aufmerksamkeit von der Frage, was zuerst zu tun ist.
