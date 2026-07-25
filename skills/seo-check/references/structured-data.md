# Strukturierte Daten: Pflichtfelder je Typ

Nur die Typen, die in der Praxis Rich Results auslösen. Ein Typ ohne seine Pflichtfelder ist nicht ungültig, aber wirkungslos: er erzeugt keine Darstellung in den Suchergebnissen.

---

## Article, NewsArticle, BlogPosting

| Feld | Status |
| :-- | :-- |
| `headline` | Pflicht |
| `author` | Pflicht, als `Person`- oder `Organization`-**Objekt** |
| `datePublished` | Pflicht, ISO 8601 |
| `image` | Pflicht |
| `publisher` | Pflicht, mit `name` und `logo` |
| `dateModified` | empfohlen |
| `mainEntityOfPage` | empfohlen |

`author` als Zeichenkette ist der häufigste Fehler. `"author": "Lars Decker"` ist für eine Suchmaschine nicht von einer beliebigen anderen Person gleichen Namens unterscheidbar. Als Objekt mit `url` und stabiler `@id` wird daraus eine identifizierbare Entität — und genau darüber entsteht Autorität für Einzelpersonen.

---

## Product

| Feld | Status |
| :-- | :-- |
| `name` | Pflicht |
| eines von `offers`, `review`, `aggregateRating` | Pflicht für Rich Results |
| `image`, `description`, `sku`, `brand` | empfohlen |

`offers` braucht mindestens `price` und `priceCurrency`; `availability` wird erwartet.

**`aggregateRating` nur, wenn echte Bewertungen sichtbar auf der Seite stehen.** Ein Sterne-Wert ohne sichtbare Rezensionen ist ein Richtlinienverstoß, kein Optimierungstrick.

---

## FAQPage

| Feld | Status |
| :-- | :-- |
| `mainEntity` | Pflicht, Liste von `Question` |
| `Question.name` | Pflicht |
| `Question.acceptedAnswer` | Pflicht, als `Answer` mit `text` |

**Bedingung:** Fragen und Antworten müssen sichtbar auf der Seite stehen. FAQ-Markup für Inhalte, die nur im Markup existieren, ist ein Verstoß.

Nicht auf Seiten anwenden, deren Hauptzweck kein Frage-Antwort-Format ist.

---

## Recipe

`name`, `image`, `recipeIngredient`, `recipeInstructions` sind Pflicht. Empfohlen: `cookTime`, `prepTime`, `totalTime` (ISO-8601-Dauer wie `PT30M`), `recipeYield`, `nutrition`.

---

## LocalBusiness

`name` und `address` (als `PostalAddress`) sind Pflicht. Empfohlen: `telephone`, `openingHoursSpecification`, `geo`, `url`, `priceRange`.

Angaben müssen mit dem Unternehmensprofil bei Google übereinstimmen. Widersprüche schaden mehr als fehlende Angaben.

---

## Organization

`name` und `url` sind Pflicht. Empfohlen: `logo`, `sameAs` (Profile, die dieselbe Organisation belegen), `contactPoint`.

`sameAs` ist der wirksamste Teil: Es verbindet die Entität mit Belegen außerhalb der eigenen Domain. Eine Selbstaussage mit externen Ankern wiegt mehr als eine ohne.

---

## Event

`name`, `startDate` (ISO 8601), `location` sind Pflicht. Empfohlen: `endDate`, `offers`, `performer`, `eventStatus`, `eventAttendanceMode`.

---

## BreadcrumbList

`itemListElement` ist Pflicht: Liste von `ListItem` mit `position`, `name` und `item`. Die Reihenfolge muss dem tatsächlichen Pfad entsprechen.

---

## Aufbau als Graph

Bei mehreren Entitäten auf einer Seite `@graph` verwenden und über `@id` verknüpfen, statt unverbundene Blöcke abzulegen:

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": "https://example.com/#person",
      "name": "Lars Decker",
      "url": "https://example.com/about",
      "sameAs": ["https://www.linkedin.com/in/…"]
    },
    {
      "@type": "WebPage",
      "@id": "https://example.com/blog/artikel#webpage",
      "url": "https://example.com/blog/artikel",
      "isPartOf": { "@id": "https://example.com/#website" }
    },
    {
      "@type": "BlogPosting",
      "@id": "https://example.com/blog/artikel#post",
      "headline": "…",
      "author": { "@id": "https://example.com/#person" },
      "datePublished": "2026-07-20",
      "dateModified": "2026-07-25",
      "mainEntityOfPage": { "@id": "https://example.com/blog/artikel#webpage" }
    }
  ]
}
```

**Die `@id` muss über alle Seiten identisch sein.** Wechselt sie, entstehen so viele Entitäten wie Seiten, und keine davon sammelt Autorität. Das ist der Unterschied zwischen „auf 30 Seiten steht ein Name" und „eine Person hat 30 Seiten geschrieben".

---

## Prüfung

- **Google Rich Results Test** — prüft Eignung für Rich Results, also die Pflichtfelder.
- **Schema.org Validator** — prüft die Syntax gegen das Vokabular, ohne Google-Anforderungen.

Beide sind nötig: Gültiges Schema kann für Rich Results unzureichend sein, weil Google mehr verlangt als das Vokabular.

## Häufige Fehler in der Reihenfolge ihrer Häufigkeit

1. `author` oder `publisher` als Zeichenkette statt als Objekt
2. Nachgestelltes Komma oder einfache Anführungszeichen → gesamter Block ungültig
3. Fehlende Pflichtfelder → keine Rich Results, obwohl das Markup „funktioniert"
4. Wechselnde oder fehlende `@id` bei wiederkehrenden Entitäten
5. Typ passt nicht zum Seiteninhalt (`Product` auf einer Kategorieseite)
6. Datumsangaben nicht in ISO 8601
