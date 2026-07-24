# Übersetzung in Stakeholder-Sprache

Der häufigste Grund, warum Refactoring-Budget nicht bewilligt wird, ist nicht Desinteresse. Es ist, dass der Antrag in einer Sprache gestellt wird, in der der Empfänger keine Entscheidung treffen kann.

Ein Stakeholder kann nicht entscheiden, ob ein Modul „zu stark gekoppelt" ist. Er kann entscheiden, ob er Risiko akzeptiert oder Zeit investiert. Deine Aufgabe ist, die Frage so zu stellen, dass sie in seiner Währung beantwortbar ist.

---

## Die drei Währungen

Jeder Befund muss in mindestens eine dieser drei Währungen übersetzt werden. Wenn keine passt, ist es kein Registereintrag.

| Währung | Frage, die sie beantwortet | Typische Formulierung |
| :-- | :-- | :-- |
| **Zeit** | Wie viel langsamer sind wir? | „Änderungen in diesem Bereich brauchen erkennbar länger, weil …" |
| **Risiko** | Was kann passieren und wie wahrscheinlich? | „Eine Änderung hier kann unentdeckt ein zweites Verhalten brechen, weil …" |
| **Handlungsfähigkeit** | Was können wir aktuell nicht tun? | „Solange dieser Bereich so gebaut ist, ist Anforderung Y nicht ohne Umbau umsetzbar." |

Die dritte Währung wird am häufigsten vergessen und wirkt am stärksten. Ein Stakeholder, der hört „wir könnten schneller sein", vertagt. Ein Stakeholder, der hört „das geplante Feature ist so nicht umsetzbar", entscheidet.

---

## Formulierungsmuster

Jeder Eintrag folgt derselben Kette: **Beobachtung → Konsequenz → kleinster Schritt.** Die Beobachtung ist überprüfbar, die Konsequenz ist begründet, der Schritt ist klein genug, um ihn zuzusagen.

### Gut

> **Preisberechnung im Checkout** — Die Datei `src/checkout/pricing.ts` wurde in 12 Monaten 34-mal geändert und umfasst 890 Zeilen. Eine zugehörige Testdatei existiert nicht. In 8 von 12 Fällen wurde gleichzeitig `src/orders/summary.ts` angepasst, obwohl beide in getrennten Modulen liegen.
>
> **Konsequenz:** Preisänderungen sind der häufigste Änderungstyp in diesem Produkt und treffen den Bereich mit der geringsten Absicherung. Wird bei einer Änderung die zweite Stelle vergessen, weichen angezeigter und berechneter Preis voneinander ab – ein Fehler, der erst beim Kunden auffällt.
>
> **Kleinster wirksamer Schritt:** Tests für die drei Berechnungspfade Rabatt, Steuer und Versand. Damit ist der häufigste Änderungstyp abgesichert, ohne die Struktur anzufassen.
>
> **Priorität:** hoch — betrifft Bezahlvorgang, Fehler ist kundensichtbar.

Warum das funktioniert: Jede Zahl ist überprüfbar. Die Konsequenz ist erklärt, nicht behauptet. Der Schritt ist so klein, dass niemand ihn ablehnen muss. Und die Priorität begründet sich aus der Domäne, nicht aus dem Score.

### Schlecht

> **Checkout-Modul** — Hohe Kopplung und niedrige Testabdeckung. Der Code verletzt das Single-Responsibility-Prinzip und sollte refactored werden. Geschätzter Aufwand: 3 Wochen. Technical Debt Score: 8,4/10.

Was hier schiefgeht: „Verletzt SRP" ist für den Empfänger nicht entscheidbar. Die 3 Wochen sind erfunden. Der Score suggeriert Objektivität, die nicht existiert. Und „sollte refactored werden" nennt kein Ergebnis, sondern eine Tätigkeit.

---

## Verbotene Formulierungen

| Nicht schreiben | Grund | Stattdessen |
| :-- | :-- | :-- |
| „Der Code ist schlecht/hässlich/chaotisch" | Wertung ohne Beleg, greift Menschen an | Messwert nennen |
| „kostet ca. 12 Personentage" | Zahl ohne Grundlage zerstört die Glaubwürdigkeit des ganzen Dokuments | „Aufwand vom Team zu schätzen" |
| „Best Practice ist …" | Autoritätsargument, lädt zur Grundsatzdebatte ein | Konkrete Konsequenz im *diesem* Projekt |
| „Technical Debt Score: 7,3" | Erfundene Präzision | Ordinal: hoch / mittel / niedrig, mit Begründung |
| „muss dringend refactored werden" | Dringlichkeit ohne Anlass wirkt wie Alarmismus und wird abgewertet | Anlass benennen: „vor dem geplanten Feature X" |
| „Wir sollten auf Framework Y migrieren" | Lösung vor Problem | Erst die Kosten der jetzigen Lösung belegen |
| „niemand versteht diesen Code" | nicht überprüfbar, klingt nach Schuldzuweisung | „N Änderungen von einer Person, keine weitere Beteiligung" |

---

## Der Einseiter für Management

Nur auf Nachfrage erzeugen. Er ist kein Ersatz für das Register, sondern die Einstiegsseite dazu.

Struktur, maximal eine Seite:

**1. Ein Satz zum Zustand.** Ohne Zahlen, ohne Dramatik. „Die Codebasis ist funktionsfähig; drei Bereiche verursachen wiederkehrende Zusatzkosten bei Änderungen."

**2. Die drei wichtigsten Punkte**, je zwei Sätze: Was ist beobachtbar, was folgt daraus. Keine Dateinamen – Bereiche in Produktsprache („Bezahlvorgang", „Kundenverwaltung").

**3. Die Entscheidung, um die du bittest.** Konkret und begrenzt: „Freigabe von 15 % der Sprint-Kapazität für die nächsten drei Sprints für Punkt 1 und 2." Nicht: „mehr Zeit für Qualität".

**4. Was passiert, wenn nichts passiert.** Sachlich, ohne Drohung. Der Punkt ist nicht Angst, sondern eine ehrliche Alternative: Nichts zu tun ist eine legitime Option, wenn ihre Kosten bekannt sind.

**5. Was ausdrücklich nicht vorgeschlagen wird.** Dieser Punkt fehlt fast überall und wirkt am stärksten: „Kein Neuschreiben, keine Technologiewechsel, keine Verschiebung geplanter Features." Er nimmt dem Empfänger die Sorge, dass hinter dem Antrag ein größeres Projekt steckt.

---

## Umgang mit Rückfragen

**„Warum ist das jetzt plötzlich ein Problem?"**
Es ist nicht plötzlich. Änderungskosten steigen graduell und werden erst sichtbar, wenn man sie messt. Nenne den Anlass der Messung ehrlich – auch wenn er „Projektübernahme" oder „regelmäßige Inventur" lautet.

**„Können wir das nicht später machen?"**
Ja, häufig kann man. Antworte ehrlich: welche Einträge zeitkritisch sind (weil ein geplantes Feature den Bereich berührt) und welche nicht. Ein Register, in dem alles dringend ist, verliert seine Funktion.

**„Wie viel schneller werden wir dadurch?"**
Diese Frage ist nicht seriös beantwortbar, und ein Versuch beschädigt die Glaubwürdigkeit. Sage das – und biete an, was messbar ist: die Zeit bis zur nächsten Änderung in dem Bereich, vor und nach der Maßnahme.

**„Ist das nicht einfach Aufräumen, das ihr sowieso machen solltet?"**
Berechtigte Frage. Trenne, was ins normale Vorgehen gehört (Tests für neuen Code, Bereinigung im Rahmen ohnehin geplanter Änderungen) und was eine eigene Entscheidung braucht (Bereiche, die niemand aus laufender Arbeit heraus berührt). Nur Letzteres gehört in einen Antrag.
