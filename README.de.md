# Agent Skills von Lars Decker

[English](README.md) · **Deutsch**

Skills für Coding-Agenten an der Schnittstelle zwischen Produktarbeit und Entwicklung. Alle liefern belegbare Ergebnisse aus messbaren Signalen – keine Einschätzungen aus dem Bauch, keine erfundenen Zahlen, und in jedem Skill eine ausdrückliche Liste dessen, was er **nicht** kann.

Die meisten veröffentlichten Skills helfen beim Schreiben von Code. Diese helfen bei Entscheidungen **über** Code – Priorisierung, Begründung, Auffindbarkeit.

| Skill | Was er tut |
| :-- | :-- |
| **tech-debt-ledger** | Erzeugt aus einem Git-Repository ein Tech-Debt-Register in Stakeholder-Sprache: Hotspots aus Churn × Größe, Änderungskopplung, Wissensrisiken, Testlücken – übersetzt in Risiko und kleinste wirksame Gegenmaßnahme. |
| **seo-check** | Prüft eine Website gegen ein Regelwerk mit konkreten Schwellwerten: Title, Description, Canonical, Robots-Direktiven, Überschriften, robots.txt, Sitemap, Rendering, Statuscodes, Bilder, Links, hreflang, Open Graph, JSON-LD. |
| **seo-fix** | Setzt die Befunde im Code um – framework-gerecht, nach Wirkung priorisiert, mit Gegenprobe. Trennt strikt zwischen mechanischen Fixes und inhaltlichen Entscheidungen. |
| **geo-audit** | Prüft eine Website auf Auffindbarkeit in KI-Antwortmaschinen: Retrieval-Crawler-Zugang, llms.txt, Entity-Klarheit über JSON-LD, Zitierfähigkeit der Absätze – mit konkreter Fix-Liste. |

`seo-check` und `geo-audit` teilen sich das Thema Auffindbarkeit ohne Überschneidung: klassische Suche mit Ergebnisliste → `seo-check`. Formulierte Antwort mit Quellenangabe → `geo-audit`. Kein Skill prüft, was der andere prüft, damit keine widersprüchlichen Empfehlungen entstehen.

## Agentenunabhängig

Ein Skill ist hier nichts anderes als eine `SKILL.md`: Markdown mit YAML-Frontmatter, daneben Referenztexte und abhängigkeitsfreie Node-Scripts. Nichts davon ist an einen Anbieter gebunden.

Was sich zwischen den Agenten unterscheidet, ist nur, **wo sie nach Anweisungen suchen**. Genau das erledigt `install.mjs`: Es legt die Skill-Dateien unter `.agents/skills/<name>/` ab und schreibt an der jeweils erwarteten Stelle einen Einstiegspunkt, der darauf verweist.

```bash
git clone https://github.com/larsdecker/agents-skills
cd agents-skills
node install.mjs --list
```

Dann in dein Projekt installieren:

```bash
node /pfad/zu/agents-skills/install.mjs --agent cursor --target .
```

| `--agent` | Agent | Wird geschrieben |
| :-- | :-- | :-- |
| `claude` | Claude Code | `.claude/skills/<name>/` (nativ, kein Verweis nötig) |
| `cursor` | Cursor | `.cursor/rules/<name>.mdc` |
| `copilot` | GitHub Copilot | `.github/instructions/<name>.instructions.md` |
| `windsurf` | Windsurf | `.windsurf/rules/<name>.md` |
| `cline` | Cline / Roo Code | `.clinerules/<name>.md` |
| `agents` | Codex, Zed, Amp, opencode, Jules, Factory … | Abschnitt in `AGENTS.md` |
| `gemini` | Gemini CLI | Abschnitt in `GEMINI.md` |

Weitere Optionen: `--skill <name>` für einen einzelnen Skill, `--dry-run` zum Vorabprüfen.

Die Abschnitte in `AGENTS.md` und `GEMINI.md` sind mit Markern versehen: ein erneuter Lauf ersetzt sie, statt sie zu duplizieren, und bestehender Inhalt der Datei bleibt unangetastet.

**Dein Agent ist nicht dabei?** Dann kopiere das Skill-Verzeichnis an einen beliebigen Ort und verweise in der Anweisungsdatei deines Agenten darauf. Mehr braucht es nicht – die Skills enthalten keinen agentenspezifischen Code.

**Ganz ohne Agent:** Beide Scan-Scripts sind normale Node-Programme (Node ≥ 18, keine Abhängigkeiten) und lassen sich direkt ausführen. Der Agent interpretiert die Ergebnisse, er erzeugt sie nicht.

```bash
node skills/tech-debt-ledger/scripts/scan-repo.mjs --since 12m --json
```

```bash
node skills/seo-check/scripts/seo-scan.mjs --site https://example.com --max-pages 5
```

```bash
node skills/geo-audit/scripts/geo-scan.mjs --site https://example.com --max-pages 5
```

### Claude Code als Plugin

In Claude Code geht es zusätzlich über den Plugin-Marketplace – dann übernimmt Claude Code Installation und Updates:

```bash
/plugin marketplace add larsdecker/agents-skills
```

```bash
/plugin install tech-debt-ledger@lars-decker
```

```bash
/plugin install geo-audit@lars-decker
```

`/reload-plugins` aktiviert sie in der laufenden Sitzung.

## tech-debt-ledger

**Das Problem:** Entwickler sehen technische Schulden, können sie aber nicht in Budget übersetzen. Product Owner müssen sie priorisieren, können sie aber nicht selbst erkennen. Beide Seiten reden über dasselbe und meinen Verschiedenes.

**Was der Skill macht:** Er kombiniert Änderungshäufigkeit mit Umfang. Der Kern ist eine einfache, aber folgenreiche Unterscheidung: eine große Datei, die niemand anfasst, kostet nichts. Eine große Datei, die wöchentlich geändert wird, zahlt den Aufschlag bei jeder Anforderung erneut. Nur die zweite gehört in ein Register.

Signale, die erhoben werden:

- **Hotspots** — Churn × Größe, normalisiert auf das Maximum im Zeitfenster
- **Änderungskopplung** — Dateien, die regelmäßig gemeinsam geändert werden, obwohl sie in getrennten Modulen liegen; der beste verfügbare Hinweis auf fehlende Abstraktion
- **Wissensrisiko** — hoher Churn bei einem einzigen Autor (wird in Solo-Repos unterdrückt, weil es dort keine Erkenntnis ist)
- **Testlücken** — Hotspots ohne zugeordnete Testdatei; fehlt Testinfrastruktur ganz, wird daraus ein struktureller Eintrag statt einer Liste
- **Toter Code** — unberührt und unreferenziert, mit Filter für Konventions-Einstiegspunkte wie `page.tsx` oder `*.config.js`

Ausgabe ist ein `TECH-DEBT.md`, das bei jedem Durchlauf fortgeschrieben wird: bestehende Einträge werden aktualisiert, erledigte wandern mit Datum in einen Abschnitt „Behoben". Der eigentliche Wert entsteht beim zweiten Durchlauf, wenn eine Entwicklung sichtbar wird statt eines Zustands.

**Was er bewusst nicht tut:** keine Aufwandsschätzung in Personentagen (das kann nur das Team), keine statische Codeanalyse (dafür gibt es ESLint und Sonar), keine Sicherheitsprüfung.

## seo-check und seo-fix

Zwei Skills für denselben Bereich, mit klarer Arbeitsteilung: `seo-check` findet und bewertet, `seo-fix` setzt um. Getrennt, weil Finden und Ändern unterschiedliche Rechte und unterschiedliche Vorsicht brauchen — ein Audit darf jederzeit laufen, eine Änderung an produktiven Weiterleitungen nicht.

**Das Regelwerk** ist explizit und liegt offen: Schwellwerte für Title-Breite und -Länge, Description-Grenzen für Desktop und Mobil, Canonical-Fehlerbedingungen, gültige Robots-Direktiven und ihre Vorrangregeln, robots.txt-Gruppenisolierung, Sitemap-Limits, Statuscode-Behandlung, Bildgrößen und -attribute, hreflang-Codes, Open-Graph-Bildmaße und Pflichtfelder je Schema-Typ. Alle Werte stehen im Objekt `LIMITS` am Anfang des Scan-Scripts und in `references/rules.md` — mit Begründung und, wichtiger, mit der Angabe, **wann eine Regel nicht gilt**.

Was diese beiden von einem generischen SEO-Werkzeug unterscheidet:

- **Wirkungsreihenfolge statt Checklistenlänge.** Fünf Stufen von Indexierbarkeit bis Feinschliff. Ein perfekter Title auf einer Seite mit `noindex` ist wertlos — deshalb wird nie parallel gearbeitet.
- **Lesbarkeit sprachrichtig gemessen.** Für deutschsprachige Seiten die Amstad-Variante der Flesch-Formel statt der englischen. Der oft zitierte Zielbereich 60–70 gilt für Englisch; deutsche Fachtexte liegen strukturell darunter, und ein Befund dagegen führt zu schlechterem Text. Auf Übersichts- und Rechtsseiten wird gar nicht gemessen.
- **Vorlage statt Einzelseite.** Jeder Befund wird danach eingeordnet, ob er eine Seite oder eine Vorlage betrifft — der Unterschied zwischen fünf Minuten und fünf Tagen.
- **Keine Punktzahl.** Ein „SEO-Score 78/100" suggeriert Messgenauigkeit, die nicht existiert, und lenkt von der Frage ab, welche zwei Dinge zuerst zu tun sind.
- **Harte Grenzen in `seo-fix`.** Kein Entfernen von `noindex` ohne Rückfrage, kein Markup für nicht sichtbare Inhalte, keine erfundenen Bewertungen, keine `alt`-Texte für ungesehene Bilder, kein `dateModified` aus dem Deployment-Zeitpunkt. Die ersten drei sind Richtlinienverstöße mit Sanktionsrisiko, die letzten zwei entwerten Signale still.

**Nicht messbar und deshalb ausdrücklich ausgewiesen:** Core Web Vitals (brauchen Browser oder Felddaten — der Scan meldet nur die bekannten Auslöser), Übereinstimmung mit der Suchintention, inhaltliche Tiefe, domainübergreifender Duplicate Content.

## geo-audit

**Das Problem:** Antwortmaschinen zitieren Absätze, keine Seiten. Klassische SEO-Werkzeuge messen das nicht, weil sie auf Ranking optimieren – nicht auf Übernehmbarkeit einer Aussage.

**Was der Skill macht:**

- **Crawler-Zugang** mit der Unterscheidung, die fast überall fehlt: Retrieval gegen Training. `GPTBot` zu blockieren kostet keine Sichtbarkeit in Antworten, `OAI-SearchBot` zu blockieren schon. Ein blockierter Training-Bot wird deshalb als Feststellung gemeldet, nicht als Fehler.
- **Entity-Klarheit** — JSON-LD auf `Person`/`Organization`, `@id`-Verknüpfung über Seiten hinweg, `sameAs`-Anker. Für Einzelpersonen und kleine Firmen der wirksamste Hebel, weil er Autorität herstellt, die sonst nur über Bekanntheit entsteht.
- **Zitierfähigkeit** — Anteil der Sätze, die mit einem Rückverweis beginnen und außerhalb ihres Kontexts unbrauchbar sind; Satzlängen; ob die Antwort vor der Herleitung steht. Prosa-Kriterien werden nur auf Artikelseiten angewandt: auf Übersichtsseiten verschmelzen Teaser-Fragmente zu Scheinsätzen und verzerren jede Messung.
- **Struktur** — Fragen als Überschriften, extrahierbare Listen und Tabellen, saubere Hierarchie
- **llms.txt** — Vorhandensein und Aufbau, inklusive Erkennung des häufigsten Fehlers: eine SPA liefert für `/llms.txt` HTML mit Status 200 aus, und die Datei ist praktisch nicht vorhanden

Das Script führt nur GET-Anfragen aus, wartet zwischen Seiten und identifiziert sich mit eigenem User-Agent.

**Was er bewusst nicht tut:** keine Messung tatsächlicher Sichtbarkeit. Ob ein Modell zitiert, hängt von Trainingsdaten, Index-Stand und Konkurrenz zur konkreten Frage ab – nichts davon ist von außen prüfbar. Der Audit prüft Voraussetzungen, nicht Ergebnisse. Wer eine Garantie verspricht, verkauft etwas anderes.

## Aufbau des Repositories

```
skills/                              agentenneutrale Quelle
├── tech-debt-ledger/
│   ├── SKILL.md                     Ablauf und Regeln
│   ├── references/                  Taxonomie, Stakeholder-Sprache, Vorlage
│   ├── scripts/scan-repo.mjs        Signalerhebung, abhängigkeitsfrei
│   └── .claude-plugin/plugin.json   Metadaten für Claude Code
├── seo-check/
│   ├── SKILL.md
│   ├── references/                  Regelwerk, Statuscodes, Schema-Pflichtfelder
│   └── scripts/seo-scan.mjs
├── seo-fix/
│   ├── SKILL.md
│   └── references/                  Wirkungsreihenfolge, Framework-Muster, Textregeln
└── geo-audit/
    ├── SKILL.md
    ├── references/                  Kriterien, Crawler, llms.txt, Fix-Muster
    ├── scripts/geo-scan.mjs
    └── .claude-plugin/plugin.json

install.mjs                          Installation je Agent
.claude-plugin/marketplace.json      Marketplace-Katalog für Claude Code
```

`skills/<name>/` ist die einzige Quelle. Es gibt keine agentenspezifischen Kopien, die auseinanderlaufen könnten – die Einstiegspunkte werden bei der Installation erzeugt und verweisen zurück auf diese Dateien.

## Hintergrund

- [Technische Schulden sichtbar machen](https://lars-decker.eu/blog/tech-debt-sichtbar-machen)
- [SEO ist nicht mehr genug: GEO](https://lars-decker.eu/blog/seo-ist-nicht-mehr-genug-geo)
- [Wie ich mir mit KI-Skills den PO-Alltag leichter mache](https://lars-decker.eu/blog/ki-skills-fuer-product-owner)

Übersicht und Details: [lars-decker.eu/skills](https://lars-decker.eu/skills)

## Rückmeldungen

Issues und Pull Requests sind willkommen. Besonders wertvoll: Fälle, in denen ein Scan einen falsch positiven Befund liefert. Beide Skills leben davon, dass ihre Heuristiken an echten Repositories und echten Sites geschärft werden – ein gemeldeter Fehlbefund verbessert sie mehr als eine neue Prüfung.

Ein Adapter für einen weiteren Agenten ist ein kleiner Eingriff: ein Eintrag im `AGENTS`-Objekt in `install.mjs`.

## Lizenz

MIT
