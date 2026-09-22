---
name: geo-audit
description: Prüft GEO Readiness, tatsächliche KI-Sichtbarkeit und Chancen einer Website. Nutze den Skill für GEO- und AI-Search-Audits, KI-Crawler-Zugang, Zitierfähigkeit, AI-Citations, llms.txt und Fragen dazu, warum eine Website in KI-Antworten fehlt oder falsch dargestellt wird.
when_to_use: "Auslöser sind unter anderem: GEO, Generative Engine Optimization, AI Search Optimization, KI-Sichtbarkeit, AI Citations, ChatGPT Search, Perplexity, Claude, Google AI Overviews, Bing AI Performance, KI-Crawler, zitierfähige Inhalte und Entity Trust."
argument-hint: "[url oder domain] [optional: --max-pages 5]"
allowed-tools: Read Grep Glob
---

# GEO Audit

Prüfe, ob eine Website technisch als Quelle verfügbar ist, relevante Fragen überzeugend beantwortet, tatsächlich in KI-Antworten erscheint und daraus geschäftlicher Nutzen entsteht. GEO ist kein Bündel KI-spezifischer SEO-Tricks.

Trenne diese Ebenen in dieser Reihenfolge:

1. **Eligibility** – darf und kann ein System Inhalte abrufen?
2. **Retrieval** – sind wichtige Inhalte technisch verfügbar und auffindbar?
3. **Understanding** – sind Thema, Absicht und Entitäten klar?
4. **Citeability** – können zentrale Passagen allein verständlich und belegbar zitiert werden?
5. **Trust & Evidence** – gibt es nachvollziehbare Erfahrung, Belege und klare Urheberschaft?
6. **Observed Visibility** – wird die Website tatsächlich erwähnt oder zitiert?
7. **Business Relevance** – entstehen Besuche, Leads oder Umsatz?

Technische Blocker haben Vorrang. Wenn ein relevanter Retrieval-Zugriff scheitert, priorisiere keine Satzstil-Empfehlungen.

## Audit-Modus wählen

Wähle den kleinsten Modus, der die Anfrage beantwortet.

### GEO Readiness

Standard, wenn nur eine Website oder URL gegeben ist. Prüfe technische Verfügbarkeit, Crawlerzugriff, Inhalte im ausgelieferten HTML, Seitenstruktur, Suchintention, Zitierfähigkeit, Belege und Entity-Klarheit. Behaupte nicht, Readiness beweise tatsächliche Sichtbarkeit.

### GEO Visibility

Verwenden, wenn gefragt wird, ob Marke oder Domain in KI-Antworten tatsächlich auftaucht. Prüfe verfügbare Citations, Marken-Erwähnungen, zitierte URLs, Grounding Queries, Themen, Intents, Citation Share und Wettbewerberquellen. Bevorzuge gemessene Plattformdaten gegenüber manuellen Prompt-Stichproben.

### Full GEO Audit

Readiness und Visibility zusammen mit einer Gap- und Chancenanalyse. Dies ist der passende Modus für eine strategische Gesamtanalyse.

## 1. Ziel und Fragen bestimmen

Bestimme, soweit verfügbar: Domain, Markt und Sprache, Produkt/Dienstleistung/Entität, Zielgruppe sowie relevante kommerzielle und informative Themen. Erfinde keine Keywords. Ermittle zuerst die Fragen, für die die Organisation als hilfreiche Quelle gelten möchte. Falls Ziel oder Zielgruppe unklar und für die Priorisierung entscheidend ist, frage gezielt nach.

Erstelle eine kleine repräsentative Fragenmenge und ordne sie Intents zu: informational, learn and solve, comparison, commercial, research, navigational oder planning. Details: `references/prompt-intent-framework.md`.

## 2. Technische Readiness

Führe den Scanner aus:

```bash
node scripts/geo-scan.mjs --site https://example.com --max-pages 5
```

Für einzelne Seiten:

```bash
node scripts/geo-scan.mjs https://example.com/artikel-a https://example.com/artikel-b
```

Wichtige Optionen: `--max-pages <n>`, `--json`, `--out <datei>`. Das Script nutzt GET-Anfragen, ist abhängigkeitsfrei und verändert nichts; nur ein ausdrücklich angegebenes `--out` schreibt eine Datei. Führe es mit dem Pfad relativ zu diesem Skill-Verzeichnis aus. Bei unbekanntem Pfad suche `geo-scan.mjs`, statt Pfade zu raten.

Wähle Seiten bewusst: Startseite, Entity-/Über-Seite sowie zwei bis drei Seiten, die wichtige Fragen beantworten. Der Scanner erhebt ausgewählte Signale zu HTTP-Abruf, robots.txt, Sitemap, Seitenstruktur und Inhalten im initialen HTML. Ergänze die manuelle Prüfung um Meta-Robots, X-Robots-Tag, `noindex`, Canonical-Ziele, Weiterleitungen und interne Auffindbarkeit; diese Punkte deckt der Scanner nicht vollständig ab. Unterscheide `robots.txt erlaubt` von `Abruf tatsächlich erfolgreich`; ein Abruf aus deiner Umgebung beweist keinen Anbieterzugriff und CDN-/WAF-Blockaden sind damit nicht ausgeschlossen. Siehe `references/technical-readiness.md` und `references/ai-crawlers.md`.

Google zufolge gibt es für AI Overviews und AI Mode keine separaten GEO-Markups oder Spezialdateien. Zugänglichkeit, Indexierbarkeit und hilfreicher Text bleiben zentral. Verwechsle Training-Crawler nicht mit Retrieval-Crawlern. Ein ausgeschlossener Training-Crawler ist ohne andere Evidenz kein Sichtbarkeits-Blocker.

## 3. Inhalt, Intent und Zitierfähigkeit

Lies repräsentative Seiten selbst. Halte je wichtiger Seite fest:

- Kernthema, Hauptintent und primäre Nutzerfrage
- ergänzende Fragen und erwarteter Antworttyp
- ob und wo die Seite diese Fragen tatsächlich beantwortet
- ob der wichtige Inhalt im HTML vorhanden und intern auffindbar ist

Prüfe die drei bis fünf wichtigsten Passagen qualitativ auf Vollständigkeit der Antwort, eigenständigen Kontext, Spezifität, Belege, Geltungsbereich und Grenzen, Aktualität sowie Attribution. Verweise wie „Das zeigt …“ sind ein Prüfsignal, aber keine automatische Fehlerklasse. Satzlänge, Frageüberschriften und Listen sind ebenfalls nur Kontextsignale.

Niemals Inhalte allein umschreiben, damit sie „KI-optimiert“ klingen. Nicht jede Überschrift muss eine Frage sein. Keine beliebigen Absatz- oder Satzlängen vorschreiben und gute Prosa nicht für vermeintliche KI-Lesbarkeit zerschneiden. Änderungen müssen Verständnis, Belegbarkeit oder Informationswert verbessern. Details: `references/content-citeability.md` und `references/fix-patterns.md`.

## 4. Original Evidence, Vertrauen und Entitäten

Suche nach originären Daten, Tests, Messungen, Beispielen, Screenshots, Benchmarks, Fallstudien, Methodik, belegter Expertenerfahrung, Quellen, Versionsangaben, Daten, Grenzen und Attribution. Unterscheide starke Belege, begrenzte Aussagen und austauschbare Inhalte ohne eigenen Informationsgewinn.

Bewerte Entity-Klarheit separat: Wer steht hinter der Aussage, welche Qualifikation ist belegt, und sind Angaben auf der Website konsistent? JSON-LD kann Maschinen helfen, Inhalte zu verstehen und Suchfunktionen zu ermöglichen. Fehlendes AI-spezifisches Schema ist kein GEO-Blocker. Erfinde keine Autorität aus bloß vorhandenen Markups. Siehe `references/entity-trust.md`.

## 5. Tatsächliche Sichtbarkeit

Wenn belastbare Daten vorliegen, prüfe Citations, zitierte Seiten, Grounding Queries, Topics, Intents, Citation Share und zeitliche Entwicklung. Unterscheide klar:

- Citation ≠ Marken-Erwähnung
- Erwähnung ≠ Empfehlung
- Empfehlung ≠ Klick
- Klick ≠ Conversion

Leite aus Citation-Zahlen keine Rankings ab. Wenn keine zuverlässigen Visibility-Daten vorliegen, sage das ausdrücklich und stelle Readiness-Befunde nicht als Sichtbarkeitsmessung dar. Details: `references/visibility-analysis.md`.

## 6. Quellenumfeld und Geschäftswirkung

Ermittle bei strategischen Audits die Drittquellen, die Antworten zu den Zielthemen prägen können: Reviews, Publisher, Foren, Communities, Referenzseiten, Wettbewerber, Marktplätze und andere Fachquellen. Prüfe, ob die Entität dort korrekt vertreten ist und welche Quellenlücken bestehen. Siehe `references/source-ecosystem.md`.

Wenn Analytics verfügbar sind, verbinde KI-Discovery mit Referral-Traffic, Engagement, Leads, Registrierungen, Warenkorbaktivität, Käufen, Umsatz oder Neukunden. Citations allein sind kein Geschäftserfolg.

## 7. Priorisieren und berichten

Vergib keinen scheinpräzisen GEO-Gesamtscore. Nutze Priorität **BLOCKER**, **HIGH IMPACT**, **OPPORTUNITY**, **MONITOR** oder **EXPERIMENTAL**. Kennzeichne Evidenz zusätzlich als **OBSERVED**, **MEASURED**, **DOCUMENTED**, **INFERRED** oder **HEURISTIC**. Eine Heuristik darf nicht als gemessene Wirkung ausgegeben werden. Definitionen: `references/prioritization.md`.

Nutze `references/output-template.md`. Trenne klar:

- was kaputt ist, was verbessert werden kann und was bereits funktioniert
- was tatsächlich gemessen oder beobachtet wurde und was erschlossen bzw. heuristisch ist
- was mit den verfügbaren Daten nicht feststellbar ist

## Experimentelle Signale

Behandle `llms.txt` und ähnliche neue Konventionen als experimentell, solange keine zuverlässige Anbieter-Dokumentation eine relevante Nutzung belegt. Sie dürfen dokumentierte technische, inhaltliche, Autoritäts- und Sichtbarkeitsprobleme nicht überholen. Details: `references/experimental-signals.md` und `references/llms-txt.md`.

## Grenzen des Audits

Ein Readiness-Audit misst nicht automatisch tatsächliche Sichtbarkeit. Ein sauberer technischer Abruf garantiert keine Citation. Der Scanner sieht keine Inhalte, die erst clientseitig nachgeladen werden, und ein User-Agent-Test beweist nicht, dass ein Anbieter-Crawler den Abruf durchführen kann. Server-Logs und Plattformdaten sind dafür geeigneter. Der Audit verifiziert nicht automatisch die inhaltliche Wahrheit, Autorität oder Geschäftswirkung. Benenne diese Grenzen im Bericht, wenn sie für die Schlussfolgerung relevant sind.
