---
name: geo-audit
description: Prüft eine Website auf Auffindbarkeit in KI-Antwortmaschinen (ChatGPT, Perplexity, Claude, Google AI Overviews) und liefert eine konkrete Fix-Liste. Nutze diesen Skill, wenn es um Generative Engine Optimization, llms.txt, KI-Crawler-Zugang, Sichtbarkeit in KI-Antworten oder darum geht, warum eine Seite in KI-Antworten nicht auftaucht oder falsch zitiert wird.
when_to_use: "Auslöser sind unter anderem: GEO, Generative Engine Optimization, AI Search Optimization, llms.txt erstellen oder prüfen, ChatGPT findet meine Seite nicht, in Perplexity sichtbar werden, AI Overviews, KI-Crawler blockieren oder erlauben, GPTBot, ClaudeBot, PerplexityBot, robots.txt für KI-Bots, strukturierte Daten für KI, zitierfähige Inhalte, Entity SEO, wie werde ich von KI zitiert."
argument-hint: "[url oder domain] [optional: --max-pages 5]"
allowed-tools: Read Grep Glob
---

# GEO Audit

Prüfe, ob eine Website für KI-Antwortmaschinen auffindbar, verständlich und zitierfähig ist – und liefere eine Fix-Liste, die nach Wirkung sortiert ist.

## Warum das nicht dasselbe wie SEO ist

Klassische Suche liefert eine Liste von Links. Der Nutzer klickt und liest selbst. Optimiert wird auf Position.

Eine Antwortmaschine liefert eine formulierte Antwort und nennt Quellen. Sie klickt nicht, sie **übernimmt Textausschnitte**. Daraus folgen drei Unterschiede, die die gesamte Prüfung bestimmen:

**Erstens: die Einheit ist der Absatz, nicht die Seite.** Ein Modell zitiert selten eine ganze Seite, sondern einzelne Aussagen. Ein Absatz, der mit „Das führt dazu, dass …" beginnt, ist außerhalb seines Kontexts unbrauchbar und wird nicht übernommen – egal wie gut die Seite rankt.

**Zweitens: Eindeutigkeit schlägt Keyword-Abdeckung.** Das Modell muss entscheiden, ob dein Inhalt zur Frage passt und wer ihn verantwortet. Widersprüchliche oder fehlende Entitätsangaben sind hier schädlicher als ein fehlendes Keyword.

**Drittens: Zugang ist binär.** Bei klassischem SEO ist schlechte Auffindbarkeit ein Gradient. Bei Antwortmaschinen ist ein blockierter Retrieval-Crawler ein hartes Aus. Deshalb steht diese Prüfung an erster Stelle.

Sage das dem Nutzer, wenn er GEO als „SEO für KI" versteht – sonst erwartet er Rankings, wo es um Zitierbarkeit geht.

## Ablauf

### Schritt 1: Ziel bestimmen

Kläre, was geprüft werden soll:

- **Live-Website**: Domain oder einzelne URLs. Das ist der Normalfall und liefert die belastbarsten Ergebnisse, weil du siehst, was ein Crawler tatsächlich ausgeliefert bekommt.
- **Lokales Projekt vor dem Deployment**: Wenn kein Live-Stand existiert, arbeite auf dem Repository. Dann prüfst du Templates, Strukturdaten-Erzeugung und Routen statt gerenderter Seiten – und sagst klar, dass die Zitierfähigkeit des Inhalts so nicht bewertbar ist.

Frage nach dem **Ziel der Sichtbarkeit**, wenn es nicht aus dem Gespräch hervorgeht: Soll die Seite als Quelle für Fachfragen dienen, als Nachweis für eine Person oder Firma (Entity), oder für Produktvergleiche? Die Antwort verschiebt die Priorisierung der Befunde erheblich.

### Schritt 2: Scan ausführen

Das Script liegt neben dieser Datei unter `scripts/geo-scan.mjs`:

```bash
node scripts/geo-scan.mjs --site https://example.com --max-pages 5
```

Einzelne Seiten prüfen:

```bash
node scripts/geo-scan.mjs https://example.com/artikel-a https://example.com/artikel-b
```

Den passenden Pfad bestimmen:

- **Claude Code als Plugin:** `node "${CLAUDE_PLUGIN_ROOT}/scripts/geo-scan.mjs" --site …`
- **Andere Agenten oder manuelle Installation:** relativ zum Verzeichnis dieser `SKILL.md`. Übliche Orte sind `.agents/skills/geo-audit/`, `.claude/skills/geo-audit/` oder ein Checkout des Repositories.
- **Pfad unbekannt:** im Projekt nach `geo-scan.mjs` suchen, statt zu raten.

| Option | Wirkung |
| :-- | :-- |
| `--site <url>` | Origin für Site-Prüfungen; zieht Seiten aus der Sitemap |
| `--max-pages <n>` | Obergrenze geprüfter Seiten (Standard: 5) |
| `--json` | JSON zusätzlich zur Textzusammenfassung |
| `--out <datei>` | JSON in Datei schreiben |

Das Script führt ausschließlich GET-Anfragen aus, wartet zwischen den Seiten und identifiziert sich mit eigenem User-Agent. Es verändert nichts.

**Wähle die Seiten bewusst.** Fünf gut gewählte Seiten sind aussagekräftiger als fünfzig zufällige: die Startseite, eine Entity-Seite (Über/Impressum), und zwei bis drei inhaltliche Seiten, die tatsächlich Fragen beantworten. Übersichtsseiten liefern für die Inhaltsprüfung wenig – der Scan erkennt sie und wendet Prosa-Kriterien dort nicht an.

### Schritt 3: Befunde einordnen

Der Scan liefert Befunde in drei Stufen. Deine Aufgabe ist nicht, sie weiterzugeben, sondern sie zu **gewichten und zu begründen**.

**`kritisch`** blockiert Sichtbarkeit vollständig. Fast immer entweder ein ausgeschlossener Retrieval-Crawler oder fehlende beziehungsweise fehlerhafte Strukturdaten. Diese Punkte gehören zuerst behandelt und brauchen keine weitere Priorisierungsdiskussion.

**`mittel`** verringert die Wahrscheinlichkeit, als Quelle gewählt zu werden.

**`hinweis`** ist Feinschliff. Melde diese Punkte gesammelt, nicht einzeln ausformuliert – sonst erscheint die Liste länger als das Problem.

Prüfe jeden Befund gegen den Kontext, bevor du ihn übernimmst. Zwei Beispiele, bei denen der Scan zwangsläufig zu wenig weiß:

- Ein blockierter **Training**-Crawler (GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended) ist oft eine bewusste Entscheidung und kein Fehler. Er kostet keine Sichtbarkeit in Antworten. Melde ihn als Feststellung, nicht als Problem – und erkläre den Unterschied zu Retrieval-Crawlern, statt zum Entblocken zu drängen.
- Ein fehlendes `dateModified` auf einer Impressumsseite ist bedeutungslos. Auf einem Fachartikel ist es relevant.

Details zu allen Kriterien und ihrer Begründung: `references/geo-criteria.md`. Crawler-Übersicht mit Zweck und Auswirkung: `references/ai-crawlers.md`.

### Schritt 4: Inhalt selbst lesen

Der Scan misst Struktur und liefert sprachliche Kennzahlen. Er kann nicht beurteilen, **ob der Inhalt eine Frage beantwortet**. Das ist der wichtigste Teil und nur durch Lesen zu klären.

Öffne eine oder zwei der wichtigsten Seiten und prüfe:

- **Beantwortet die Seite eine Frage, die jemand tatsächlich stellt?** Oder beschreibt sie ein Thema, ohne eine Frage zu schließen? Themenseiten werden nicht zitiert, weil aus ihnen keine Antwort zu entnehmen ist.
- **Steht die Antwort früh?** Antwortmaschinen bevorzugen Passagen, in denen die Aussage vor der Herleitung kommt. Ein Text, der auf eine Pointe hinarbeitet, wird schlechter zitiert – auch wenn er für Menschen besser zu lesen ist. Benenne diesen Zielkonflikt offen, statt eine Empfehlung zu geben, die den Stil des Autors überschreibt.
- **Gibt es überprüfbare Substanz?** Zahlen, Beispiele, benannte Werkzeuge, Versionen, Grenzen. Allgemeine Aussagen ohne Beleg sind austauschbar, und ein Modell wählt bei Austauschbarkeit die etabliertere Quelle.
- **Ist erkennbar, wer das schreibt und warum das qualifiziert?** Das ist der Punkt, an dem kleine Sites gegen große Portale gewinnen können.

Konkrete Umformulierungsmuster mit Vorher/Nachher: `references/fix-patterns.md`.

### Schritt 5: Ergebnis liefern

Standardmäßig als Bericht im Chat, nicht als Datei – außer der Nutzer will ein Dokument.

Struktur:

1. **Ein Satz zum Gesamtbild.** Ehrlich. Wenn die Site technisch gut aufgestellt ist und nur inhaltlich Substanz fehlt, sage genau das.
2. **Kritische Punkte** mit Begründung und konkretem Fix (Codeausschnitt, robots.txt-Zeile, JSON-LD-Block).
3. **Mittlere Punkte**, nach Wirkung sortiert.
4. **Hinweise**, gesammelt in einer Liste.
5. **Was schon gut ist.** Nicht als Höflichkeit, sondern zur Abgrenzung: sonst ändert jemand etwas, das bereits funktioniert.
6. **Was dieser Audit nicht zeigen kann** (siehe unten).

Bei Befunden, die im Code behoben werden können und wo der Nutzer Zugriff auf das Repository hat: biete die Umsetzung an, statt sie nur zu beschreiben.

### Schritt 6: llms.txt (nur auf Wunsch)

Wenn eine `llms.txt` fehlt oder schwach ist, biete an, sie zu erzeugen. Format und Regeln: `references/llms-txt.md`.

Zwei Dinge dabei richtig einordnen:

- **Wirkung ist unbestätigt.** `llms.txt` ist ein Vorschlag, dessen Auswertung von den großen Anbietern nicht öffentlich zugesichert ist. Sie ist billig und unschädlich, aber verkaufe sie nicht als Hebel. Wer sie als Grund für ausbleibende Sichtbarkeit nennt, hat meist ein anderes Problem.
- **Generieren, nicht pflegen.** Eine handgeschriebene `llms.txt` veraltet. Wenn das Projekt einen Generator für Sitemap oder Feeds hat, gehört sie dort hinein.

## Was dieser Audit nicht zeigen kann

Sage das aktiv – es verhindert falsche Erwartungen und ist der Teil, den vergleichbare Werkzeuge verschweigen:

- **Keine Messung tatsächlicher Sichtbarkeit.** Ob ein Modell die Seite zitiert, hängt von Faktoren ab, die von außen nicht prüfbar sind: Trainingsdaten, Index-Stand, Autorität, Konkurrenz zur konkreten Frage. Der Audit prüft Voraussetzungen, nicht Ergebnisse.
- **Keine Erfolgsgarantie.** Wenn jemand fragt „taucht meine Seite danach in ChatGPT auf?", ist die ehrliche Antwort: unbekannt. Was du zusagen kannst, ist, dass keine technische Hürde mehr im Weg steht.
- **Kein Ersatz für eine Log-Analyse.** Ob KI-Crawler die Seite tatsächlich abrufen, steht in den Server-Logs. Verweise darauf, wenn Sichtbarkeit trotz sauberer Konfiguration ausbleibt – das ist dann der nächste sinnvolle Schritt.
- **Nur serverseitiges HTML.** Clientseitig gerenderte Inhalte sieht der Scan nicht. Das ist keine Schwäche des Scans, sondern spiegelt die Sicht der meisten KI-Crawler: was JavaScript nachlädt, existiert für sie in der Regel nicht.
