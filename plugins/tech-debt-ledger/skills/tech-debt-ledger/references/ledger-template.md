# Vorlage: TECH-DEBT.md

Struktur des Registers. Übernimm die Abschnitte, nicht die Beispielinhalte.

Das Register ist ein **Verlaufsdokument**. Sein Wert entsteht beim zweiten Durchlauf, wenn sichtbar wird, was sich verändert hat. Deshalb bleiben IDs stabil und erledigte Einträge werden verschoben statt gelöscht.

---

````markdown
# Technische Schulden

**Stand:** 2026-07-24 · **Zeitfenster der Analyse:** 12 Monate · **Nächste Überprüfung:** 2026-10
**Grundlage:** 24 Commits, 35 Quelldateien, 0 Testdateien

Dieses Dokument listet Bereiche der Codebasis, die bei Änderungen wiederkehrende
Kosten oder Risiken verursachen. Es ist keine Bewertung der Arbeit des Teams und
keine Aufgabenliste – es ist eine Grundlage für Priorisierungsentscheidungen.

Jeder Eintrag nennt ein Messsignal, die daraus folgende Konsequenz und den
kleinsten Schritt, der die Konsequenz abschwächt.

---

## Zusammenfassung

| # | Bereich | Typ | Priorität | Kleinster Schritt |
| :- | :-- | :-- | :-- | :-- |
| TD-1 | Bezahlvorgang | Test-Schuld | hoch | Tests für 3 Berechnungspfade |
| TD-2 | Layout und globale Styles | Struktur-Schuld | mittel | Zuständigkeit für Theme-Variablen bündeln |
| TD-3 | Projektweit | Feedback-Schuld | mittel | Testrunner einrichten |
| TD-4 | Ungenutzte Komponenten | Toter Code | niedrig | 4 Dateien entfernen |

Priorität ergibt sich aus Geschäftsrelevanz mal Änderungshäufigkeit, nicht aus
dem Hotspot-Score. Der Score sortiert Kandidaten, er priorisiert sie nicht.

---

## TD-1 · Bezahlvorgang: Änderungen ohne Absicherung

**Typ:** Test-Schuld · **Priorität:** hoch · **Erfasst:** 2026-07-24

**Messsignal**
- `src/checkout/pricing.ts`: 890 Zeilen, 34 Commits in 12 Monaten, Hotspot-Score 70,0
- Keine zugeordnete Testdatei gefunden
- In 8 von 12 Änderungen wurde `src/orders/summary.ts` mitgeändert

**Konsequenz**
Preisänderungen sind der häufigste Änderungstyp in diesem Produkt und treffen den
Bereich mit der geringsten Absicherung. Wird bei einer Änderung die zweite Stelle
vergessen, weichen angezeigter und berechneter Preis voneinander ab. Dieser Fehler
ist vor dem Release nur durch manuelles Durchspielen des Bestellvorgangs zu finden.

**Kleinster wirksamer Schritt**
Tests für die drei Berechnungspfade Rabatt, Steuer und Versand. Damit ist der
häufigste Änderungstyp abgesichert, ohne die Struktur zu verändern.

**Annahme, die zu prüfen ist**
Ich nehme an, dass der Bezahlvorgang geschäftskritisch ist. Falls dieser Bereich
vor einer Ablösung steht, entfällt der Eintrag.

**Wenn nichts passiert**
Das Risiko bleibt bei jeder Preisänderung gleich hoch. Es wächst nicht, aber es
verschwindet auch nicht – und die Häufigkeit der Änderungen bleibt hoch.

---

## TD-2 · Layout und globale Styles: gekoppelte Änderungen

[gleiche Struktur]

---

## Beobachtet, aktuell kein Handlungsbedarf

Einzeilige Notizen zu Signalen, die aufgefallen sind, aber keine Maßnahme
rechtfertigen. Sie stehen hier, damit der nächste Durchlauf eine Veränderung
erkennen kann.

- `src/legacy/import.ts` — 1.100 Zeilen, aber 0 Änderungen in 12 Monaten. Große,
  aber ruhende Datei: kostet nichts, solange sie nicht angefasst wird.
- 1 `WORKAROUND`-Marker in `next.config.ts` — dokumentiert, mit Verweis auf ein
  Upstream-Issue. Kein Handlungsbedarf, solange das Issue offen ist.

---

## Behoben

| # | Bereich | Behoben am | Was gemacht wurde |
| :- | :-- | :-- | :-- |
| TD-0 | Build-Konfiguration | 2026-05-12 | Doppelte Postcss-Konfiguration entfernt |

---

## Methodik und Grenzen

**Erhebung:** `scan-repo.mjs` aus dem Skill `tech-debt-ledger`, Zeitfenster 12 Monate.
Hotspot-Score = (Commits / Maximum) × (Zeilen / Maximum) × 100.

**Was diese Analyse nicht kann**
- Keine Aussage über Korrektheit oder Sicherheit des Codes
- Keine Komplexitätsmetrik – Zeilenzahl ist ein Näherungswert für Umfang
- Testzuordnung über Dateinamen: eine fehlende Zuordnung ist ein Prüfhinweis,
  kein Beweis für fehlende Tests
- Aufwände sind nicht geschätzt. Das kann nur das Team, das den Code kennt.

**Offene Fragen, deren Antworten die Priorisierung verändern**
1. Welche Bereiche sind geschäftskritisch im Sinne von „darf nicht ausfallen"?
2. Welche Bereiche stehen vor einer Ablösung und lohnen keine Investition mehr?
3. Gibt es Incident-Historie, die einzelne Einträge bestätigt oder entkräftet?
````

---

## Regeln für Aktualisierungen

Bei jedem weiteren Durchlauf:

1. **Bestehende Einträge zuerst lesen.** Prüfe, ob das Messsignal noch gilt. Ein Eintrag, dessen Signal sich verbessert hat, wandert nach „Behoben" mit Datum – auch wenn die Verbesserung nebenbei entstanden ist.
2. **IDs nie neu vergeben.** TD-3 bleibt TD-3, auch wenn TD-1 und TD-2 erledigt sind. Neue Einträge zählen weiter.
3. **Veränderung sichtbar machen.** Wenn ein Signal sich verschlechtert hat, notiere beide Werte: „34 Commits (vorherige Messung: 21)". Diese Zeile ist der stärkste Inhalt des ganzen Dokuments, weil sie eine Entwicklung zeigt statt eines Zustands.
4. **Der Abschnitt „Beobachtet" wird nicht aufgeräumt.** Er ist das Gedächtnis des Registers.
