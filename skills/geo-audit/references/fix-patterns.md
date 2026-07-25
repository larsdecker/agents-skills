# Umformulierungsmuster für Zitierfähigkeit

Konkrete Vorher/Nachher-Paare. Wende sie auf die **zentralen Aussagen** einer Seite an, nicht auf jeden Satz – ein Text, in dem jeder Satz für sich stehen muss, liest sich wie eine Aufzählung.

---

## Muster 1: Rückverweis auflösen

Das häufigste Problem. Der Absatz ist verständlich, solange man den vorherigen gelesen hat – und wertlos, sobald er allein zitiert wird.

**Vorher**
> Das führt dazu, dass Änderungen deutlich länger dauern als geplant.

**Nachher**
> Fehlende Testabdeckung in häufig geänderten Modulen führt dazu, dass Änderungen deutlich länger dauern als geplant.

Der Satz enthält jetzt sein eigenes Subjekt. Als Zitat funktioniert er ohne Umgebung.

---

## Muster 2: Antwort vor Herleitung

**Vorher**
> Wir haben verschiedene Ansätze verglichen, einige Kompromisse abgewogen und uns nach längerer Diskussion für eine Lösung entschieden, die für unseren Fall am besten passt.

**Nachher**
> Wir haben uns für Rolling Wave Planning entschieden. Der Grund: Bei Projekten mit unklarem Endzustand ist eine Detailplanung über sechs Monate hinaus reine Beschäftigungstherapie.

Die Aussage steht im ersten Satz, die Begründung folgt. Beide Sätze sind einzeln zitierbar.

---

## Muster 3: Überschrift als echte Frage

**Vorher**
> ## Vorteile von Design Tokens

**Nachher**
> ## Was bringen Design Tokens gegenüber einer zentralen CSS-Datei?

Die zweite Variante trifft eine Frage, die jemand tatsächlich eingibt. Die erste ist ein Themenetikett.

Wichtig: Formuliere die Frage, die dein Text **beantwortet**. Eine Frage, auf die der Abschnitt keine klare Antwort gibt, schadet mehr als eine sachliche Überschrift.

---

## Muster 4: Vergleich als Tabelle

**Vorher**
> Während Ansatz A schnell umzusetzen ist, aber bei größeren Datenmengen an Grenzen stößt, skaliert Ansatz B besser, benötigt dafür aber deutlich mehr Einrichtungsaufwand und setzt Erfahrung mit dem Werkzeug voraus.

**Nachher**
> | Ansatz | Umsetzungsaufwand | Skalierung | Voraussetzung |
> | :-- | :-- | :-- | :-- |
> | A | gering | begrenzt ab ~10.000 Datensätzen | keine |
> | B | hoch | linear | Erfahrung mit dem Werkzeug |

Aus einem Satz mit vier verschachtelten Aussagen wird eine Struktur, die vollständig extrahierbar ist. Der Nebeneffekt ist der eigentliche Gewinn: die Tabelle erzwingt, die vagen Stellen zu konkretisieren („an Grenzen stößt" wird zu einer Zahl).

---

## Muster 5: Behauptung belegen

**Vorher**
> Technische Schulden verlangsamen Teams erheblich.

**Nachher**
> In der hier analysierten Codebasis wurden 8 von 34 Änderungen an der Preisberechnung ohne begleitenden Test durchgeführt; in drei Fällen folgte innerhalb einer Woche ein Korrektur-Commit.

Die erste Variante ist eine Aussage, die auf tausend Seiten steht und deshalb von keiner zitiert wird. Die zweite ist nur auf dieser Seite zu finden.

---

## Muster 6: Absatz mit eigener Kernaussage beginnen

**Vorher**
> Zunächst einmal ist es wichtig, den Kontext zu verstehen. In vielen Projekten gibt es historisch bedingte Strukturen, die sich über Jahre entwickelt haben und heute nicht mehr optimal sind. Deshalb sollte man vor jedem Refactoring zuerst messen.

**Nachher**
> Vor jedem Refactoring sollte gemessen werden, welche Bereiche tatsächlich Kosten verursachen. Historisch gewachsene Strukturen sind nicht automatisch ein Problem: Ein Modul, das seit zwei Jahren unverändert läuft, kostet nichts – unabhängig davon, wie es aussieht.

Die Kernaussage steht im ersten Satz. Der zweite Satz enthält jetzt eine Unterscheidung, die zitierfähig ist, statt einer Allgemeinheit.

---

## Muster 7: Entität eindeutig machen

**Vorher**
```json
{ "@context": "https://schema.org", "@type": "BlogPosting", "headline": "...", "author": "Lars Decker" }
```

**Nachher**
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": "https://example.com/#person",
      "name": "Lars Decker",
      "url": "https://example.com/about",
      "jobTitle": "Product Owner",
      "sameAs": ["https://www.linkedin.com/in/…", "https://github.com/…"]
    },
    {
      "@type": "BlogPosting",
      "@id": "https://example.com/blog/artikel#post",
      "headline": "...",
      "author": { "@id": "https://example.com/#person" },
      "datePublished": "2026-07-20",
      "dateModified": "2026-07-24"
    }
  ]
}
```

Vorher war der Autor eine Zeichenkette – nicht unterscheidbar von jeder anderen Person gleichen Namens. Nachher ist er eine Entität mit stabiler `@id` und externen Belegen, auf allen Seiten identisch referenziert.

Der entscheidende Punkt ist die **Stabilität** der `@id`. Sie muss auf jeder Seite gleich sein, sonst entstehen so viele Personen wie Seiten.

---

## Wann du nicht umformulieren solltest

- **Wenn der Text bewusst erzählend ist.** Ein Erfahrungsbericht, der auf eine Erkenntnis hinarbeitet, verliert durch Vorwegnahme seinen Wert. Nenne den Zielkonflikt und lass den Autor entscheiden.
- **Wenn die Änderung nur die Form trifft.** „Optimierte" Sätze ohne zusätzliche Substanz verbessern nichts – sie machen den Text nur mechanischer.
- **Wenn dadurch Genauigkeit verloren geht.** Ein präziser langer Satz ist besser als zwei kurze ungenaue.
- **Bei fremden Zitaten.** Zitate werden nicht umformuliert.
