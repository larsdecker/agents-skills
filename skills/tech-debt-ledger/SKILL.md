---
name: tech-debt-ledger
description: Erzeugt aus einem Git-Repository ein belegbares Tech-Debt-Register in Stakeholder-Sprache. Nutze diesen Skill, wenn technische Schulden sichtbar, priorisierbar oder gegenüber Management, Product Owner oder Kunden begründbar gemacht werden sollen – etwa für Refactoring-Budget, Roadmap-Diskussionen, Risikobewertung einer Codebasis, Übernahme eines fremden Projekts oder eine Tech-Debt-Inventur.
when_to_use: "Auslöser sind unter anderem: technische Schulden dokumentieren, Tech Debt sichtbar machen, Refactoring begründen oder verkaufen, Modernisierungsbudget beantragen, Legacy-Code bewerten, Hotspots im Code finden, Risiko einer Codebasis einschätzen, Code-Qualität an Nicht-Entwickler kommunizieren, Wartbarkeit bewerten, Bus-Faktor prüfen, Onboarding in eine unbekannte Codebasis."
argument-hint: "[optional: Pfad zum Repo] [optional: --since 12m]"
allowed-tools: Read Grep Glob
---

# Tech Debt Ledger

Übersetze messbare Eigenschaften einer Codebasis in ein Register, das ein Product Owner priorisieren und ein Management-Stakeholder verstehen kann.

Der Zweck ist nicht, Code zu kritisieren. Der Zweck ist, eine Entscheidungsgrundlage zu liefern: **Wo kostet die aktuelle Struktur wiederholt Zeit oder erzeugt Risiko, und was wäre die günstigste wirksame Gegenmaßnahme?**

## Die drei Regeln, die diesen Skill von einer Meinung unterscheiden

Halte diese Regeln über den gesamten Ablauf ein, auch wenn der Nutzer später nach schnelleren Ergebnissen fragt.

**1. Jeder Eintrag braucht ein Messsignal.**
Kein Eintrag ohne konkreten Beleg aus dem Scan oder aus gelesenem Code. „Der Code ist unübersichtlich" ist kein Eintrag. „`src/checkout/cart.ts`: 1.240 Zeilen, 47 Commits in 12 Monaten, keine Testdatei, 1 Autor" ist ein Eintrag.

**2. Erfinde keine Zahlen.**
Du kennst weder Stundensätze noch Velocity noch echte Fehlerkosten. Schreibe niemals „kostet ca. 12 Personentage pro Quartal", wenn diese Zahl nicht aus einer Quelle stammt, die dir der Nutzer gegeben hat. Nutze stattdessen ordinale Bewertungen (hoch/mittel/niedrig) und **beobachtbare** Aussagen: „jede zweite Änderung an diesem Bereich berührt zusätzlich 4 weitere Dateien". Wenn der Nutzer echte Zahlen liefert (Sprint-Länge, Teamgröße, Incident-Historie), darfst du damit rechnen – dann nennst du die Quelle.

**3. Trenne Befund von Vermutung.**
Der Scan liefert Fakten. Die Einordnung, ob ein Hotspot geschäftskritisch ist, ist eine Vermutung, solange du die Domäne nicht kennst. Markiere solche Stellen explizit als Annahme und stelle sie am Ende als Rückfrage – statt sie als Befund zu tarnen.

## Ablauf

### Schritt 1: Kontext klären, bevor du scannst

Frage nach, wenn nicht aus dem Gespräch oder Repo ableitbar (maximal einmal, gebündelt, per AskUserQuestion wenn verfügbar):

- **Adressat des Ergebnisses**: Team, Product Owner oder Management/Kunde? Das steuert die Sprachebene, nicht den Inhalt.
- **Anlass**: Budget-Antrag, Roadmap-Planung, Projektübernahme, regelmäßige Inventur?
- **Geschäftskritische Bereiche**: Welche Teile des Produkts dürfen nicht ausfallen (Bezahlung, Login, Datenexport …)? Das ist die Information, die du selbst nicht aus Code ableiten kannst und die die Priorisierung am stärksten verändert.

Wenn der Nutzer nicht antworten will oder es schnell gehen soll: scanne trotzdem, arbeite mit expliziten Annahmen und markiere sie im Ergebnis.

### Schritt 2: Scan ausführen

Das Script liegt neben dieser Datei unter `scripts/scan-repo.mjs`:

```bash
node scripts/scan-repo.mjs --json
```

Den passenden Pfad bestimmen:

- **Claude Code als Plugin:** `node "${CLAUDE_PLUGIN_ROOT}/scripts/scan-repo.mjs" --json`
- **Andere Agenten oder manuelle Installation:** relativ zum Verzeichnis dieser `SKILL.md`. Übliche Orte sind `.agents/skills/tech-debt-ledger/`, `.claude/skills/tech-debt-ledger/` oder ein Checkout des Repositories.
- **Pfad unbekannt:** im Projekt nach `scan-repo.mjs` suchen, statt zu raten.

Nützliche Optionen:

| Option | Wirkung |
| :-- | :-- |
| `--since 12m` | Zeitfenster für die Churn-Analyse (Standard: `12m`, auch `6m`, `2y`, `2025-01-01`) |
| `--top 30` | Anzahl der Hotspots im Bericht (Standard: 25) |
| `--path src` | Analyse auf ein Unterverzeichnis begrenzen |
| `--json` | Maschinenlesbare Ausgabe zusätzlich zur Textzusammenfassung |
| `--out scan.json` | Ergebnis in Datei schreiben statt nach stdout |

Das Script ist abhängigkeitsfrei (Node ≥ 18) und arbeitet nur lesend: `git log`, `git ls-files` und Dateilesezugriffe. Es schreibt nichts ins Repo, außer du gibst `--out` an.

Wenn das Verzeichnis kein Git-Repository ist, bricht das Script ab. Dann fehlt die Churn-Dimension – arbeite in diesem Fall nur mit Größe, Markern und Teststruktur und sage im Bericht klar, dass die Änderungshäufigkeit fehlt und die Priorisierung dadurch schwächer ist.

### Schritt 3: Signale lesen und verstehen

Der Scan liefert diese Signale. Was sie bedeuten – und was nicht:

**Hotspot-Score (Churn × Größe).** Der wichtigste Einzelwert. Eine große Datei, die niemand anfasst, ist billige Schuld: sie kostet nichts, solange sie in Ruhe gelassen wird. Eine große Datei, die jede Woche geändert wird, ist teure Schuld: jede Änderung zahlt den Aufschlag erneut. Refactoring lohnt dort, wo beides zusammenkommt.

**Autorenzahl pro Datei.** Ein einziger Autor bei hohem Churn ist ein Wissensrisiko (Bus-Faktor). Viele Autoren bei hohem Churn deuten auf einen Bereich, in dem sich Zuständigkeiten überlagern – oft ein Kandidat für unklare Modulgrenzen.

**Hotspots ohne Testdatei.** Die teuerste Kombination im ganzen Bericht: häufig geändert, groß, ungetestet. Jede Änderung dort ist ein Blindflug. Das ist der Befund, der in einer Stakeholder-Diskussion am besten funktioniert, weil er ohne Code-Kenntnis verständlich ist.

**Marker (TODO/FIXME/HACK/XXX/@deprecated).** Schwaches Einzelsignal – gute Teams haben viele TODOs, schlechte Teams haben keine. Interessant sind nur Cluster **innerhalb** von Hotspots und Marker, die auf bewusst aufgeschobene Entscheidungen hindeuten. Zähle sie nicht als eigenständigen Befund auf.

**Änderungskopplung (co-change).** Dateien, die auffällig oft im selben Commit geändert werden, ohne dass ein struktureller Zusammenhang erkennbar ist. Das ist der beste verfügbare Hinweis auf fehlende Abstraktion – und der Befund, der Entwicklern am meisten hilft.

**Verwaiste Dateien.** Lange nicht geändert und von niemandem importiert. Kandidaten für Löschung, nicht für Refactoring. Sortiere sie als „niedriger Aufwand, geringes Risiko" ein – das sind die Quick Wins, die ein Register glaubwürdig machen.

### Schritt 4: Top-Kandidaten im Code prüfen

Der Scan zeigt, **wo** du hinsehen sollst. Er weiß nicht, **was** dort das Problem ist. Öffne die 3–5 stärksten Hotspots und lies sie tatsächlich. Ohne diesen Schritt entsteht ein Bericht, der nach Statistik aussieht und keine Handlungsempfehlung trägt.

Suche pro Datei nach der konkreten Ursache und ordne sie einem Schuldtyp aus `references/debt-taxonomy.md` zu. Notiere den Beleg (Zeilennummern, Funktionsname), nicht den Eindruck.

Prüfe hier auch, ob ein Hotspot ein **falsch positiver** Treffer ist: generierte Dateien, Übersetzungskataloge, Migrations, Fixtures und Konfigurationsdateien sind oft groß und häufig geändert, ohne dass das ein Problem ist. Nimm sie aus dem Register heraus und erwähne die Bereinigung – das erhöht die Glaubwürdigkeit des Rests deutlich.

### Schritt 5: Optionale Zusatzsignale

Nur wenn der Nutzer zustimmt und es zum Anlass passt:

- **Abhängigkeitsdrift**: `npm outdated --json`, `pnpm outdated --json`, `pip list --outdated`. Nur Major-Versionssprünge und Pakete ohne Wartung sind ein Befund; ein Patch-Rückstand ist keiner.
- **Bekannte Schwachstellen**: `npm audit --json` oder `pnpm audit --json`. Berichte nur, was in produktiven Abhängigkeiten steckt und tatsächlich erreichbar ist – kein Rohabzug der Audit-Ausgabe.
- **Buildzeit und Testlaufzeit**: wenn im Repo dokumentiert oder aus CI-Konfiguration ablesbar. Langsame Feedback-Zyklen sind Schuld, die jedes Teammitglied jeden Tag zahlt, und in der Kommunikation sehr gut vermittelbar.

Beides sind Netzwerk- beziehungsweise Installationsvorgänge. Frage vorher.

### Schritt 6: Register schreiben

Nutze die Struktur aus `references/ledger-template.md` und die Sprachregeln aus `references/stakeholder-translation.md`.

Schreibe standardmäßig nach `TECH-DEBT.md` im Repo-Wurzelverzeichnis. Wenn die Datei existiert, lies sie erst: bestehende Einträge werden aktualisiert, nicht überschrieben, und erledigte Einträge wandern in einen Abschnitt „Behoben" mit Datum. Das macht das Register über Zeit zu einem Verlaufsdokument – der eigentliche Wert entsteht erst beim zweiten Durchlauf.

Harte Grenzen für die Ausgabe:

- **Maximal 10 Einträge.** Ein Register mit 40 Einträgen wird nicht priorisiert, sondern ignoriert. Der Rest gehört in einen Abschnitt „Beobachtet, aktuell kein Handlungsbedarf" mit je einer Zeile.
- **Jeder Eintrag nennt eine kleinste wirksame Gegenmaßnahme**, nicht die vollständige Lösung. „Testabdeckung für die drei Preisberechnungsfunktionen" statt „Checkout-Modul neu schreiben". Ein Register, dessen Einträge alle nach Großprojekt aussehen, führt zu null Entscheidungen.
- **Reihenfolge nach Wirkung, nicht nach Score.** Der Score ist ein Sortierhilfsmittel, keine Priorität. Ein mittlerer Hotspot im Bezahlvorgang steht über einem starken Hotspot im Admin-Backend.

### Schritt 7: Abschluss im Chat

Fasse im Chat in maximal fünf Sätzen zusammen: die drei wichtigsten Befunde, den empfohlenen ersten Schritt, und – getrennt davon – die offenen Fragen, deren Antworten die Priorisierung ändern würden.

Wenn der Adressat Management ist, biete zusätzlich den Einseiter aus `references/stakeholder-translation.md` an, statt ihn unaufgefordert zu erzeugen.

## Was dieser Skill nicht tut

Sage das aktiv, wenn der Nutzer mehr erwartet:

- **Keine statische Codeanalyse.** Für Komplexitätsmetriken, Duplikaterkennung oder Typfehler nutze die Werkzeuge des Ökosystems (ESLint, Sonar, `tsc`, Ruff). Dieser Skill ergänzt sie um die Dimension „was davon ist wirtschaftlich relevant".
- **Keine Sicherheitsprüfung.** Ein Hotspot ist keine Schwachstelle. Für Sicherheit braucht es einen eigenen Durchgang.
- **Keine Schätzung in Personentagen.** Aufwand kann nur das Team schätzen, das den Code kennt. Du lieferst die Grundlage für diese Schätzung, nicht die Schätzung.
