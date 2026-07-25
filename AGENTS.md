# AGENTS.md

Anweisungen für Coding-Agenten, die **an diesem Repository** arbeiten. Wer die Skills nur *benutzen* will, findet die Installation in der `README.md`.

## Was dieses Repository ist

Eine Sammlung von Agent Skills. Ein Skill besteht aus einer `SKILL.md` mit YAML-Frontmatter, optionalen Referenztexten unter `references/` und optionalen Scripts unter `scripts/`.

`skills/<name>/` ist die **einzige Quelle**. Agentenspezifische Einstiegspunkte werden von `install.mjs` bei der Installation erzeugt und dürfen nicht ins Repository eingecheckt werden.

## Regeln für Änderungen

**Keine agentenspezifischen Inhalte in `SKILL.md`.** Kein `${CLAUDE_PLUGIN_ROOT}` als einziger Pfad, keine Slash-Befehle als Voraussetzung, keine Annahme über verfügbare Werkzeuge. Wo ein Pfad nötig ist, nenne den relativen Pfad und die agentenspezifischen Varianten als Aufzählung.

**Scripts bleiben abhängigkeitsfrei.** Nur die Node-Standardbibliothek, Node ≥ 18. Kein `package.json`, kein Build-Schritt. Ein Skill, der `npm install` braucht, wird in der Hälfte der Umgebungen nicht ausgeführt.

**Scripts bleiben lesend.** `scan-repo.mjs` und `geo-scan.mjs` verändern nichts – Ausnahme ist ein ausdrücklich übergebenes `--out`. Wer das ändert, bricht die Zusage, die in beiden SKILL.md steht.

**Heuristiken müssen ihre Grenzen kennen.** Jede neue Prüfung braucht eine Antwort auf die Frage: in welchem Fall ist dieses Signal bedeutungslos? Diese Fälle werden unterdrückt statt gemeldet. Vorhandene Beispiele: Bus-Faktor in Ein-Personen-Repos, Satzlängen auf Übersichtsseiten, Konventions-Einstiegspunkte bei der Verwaist-Erkennung.

**Keine erfundenen Zahlen.** Weder in den Scripts noch in den Anleitungen. Ordinale Bewertungen und beobachtbare Aussagen statt geschätzter Personentage oder Prozentwerte.

## Nach Änderungen prüfen

```bash
node install.mjs --list
```

```bash
node install.mjs --agent agents --target /tmp/probe --dry-run
```

Wenn `.claude-plugin/marketplace.json` oder ein `plugin.json` berührt wurde:

```bash
claude plugin validate .
```

Bei Änderungen an einem Script: einmal gegen ein echtes Repository beziehungsweise eine echte Website laufen lassen und die Ausgabe prüfen. Ein Script, das ohne Fehler durchläuft, kann trotzdem unbrauchbare Werte liefern – die drei bisher wichtigsten Korrekturen entstanden genau so.

## Einen Agenten hinzufügen

Ein Eintrag im `AGENTS`-Objekt in `install.mjs`:

- `payload` — Zielverzeichnis der Skill-Dateien
- `entry` — Datei, die der Agent von sich aus liest; `null`, wenn er das Payload-Verzeichnis direkt liest
- `mode` — `'file'` für eine Datei pro Skill, `'block'` für einen verwalteten Abschnitt in einer gemeinsamen Datei
- `render` — Funktion, die den Inhalt erzeugt (nur bei `mode: 'file'`)

Belege die Pfadkonvention mit der Dokumentation des Agenten. Rate sie nicht.
