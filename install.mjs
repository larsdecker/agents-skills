#!/usr/bin/env node
/**
 * install.mjs — installiert einen Skill in die Konvention eines Coding-Agenten.
 *
 * Die Skills selbst sind agentenneutral: eine SKILL.md nach dem Agent-Skills-
 * Standard, daneben Referenztexte und abhängigkeitsfreie Node-Scripts. Was sich
 * zwischen den Agenten unterscheidet, ist nur die Frage, *wo* sie nach
 * Anweisungen suchen. Dieses Script legt die Dateien ab und schreibt an der
 * jeweils erwarteten Stelle einen Einstiegspunkt, der auf die SKILL.md verweist.
 *
 * Keine Abhängigkeiten. Node >= 18.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const skillsRoot = path.join(repoRoot, 'skills');

const MARKER_START = '<!-- agents-skills:start -->';
const MARKER_END = '<!-- agents-skills:end -->';

/**
 * `payload`  Verzeichnis, in das die Skill-Dateien kopiert werden.
 * `entry`    Datei, die der Agent von sich aus liest. `null` = der Agent liest
 *            das Payload-Verzeichnis direkt, ein Verweis ist unnötig.
 * `mode`     'file'  eine Datei pro Skill
 *            'block' ein verwalteter Abschnitt in einer gemeinsamen Datei
 */
const AGENTS = {
  claude: {
    label: 'Claude Code',
    payload: (name) => `.claude/skills/${name}`,
    entry: null,
    note: 'Alternativ als Plugin: /plugin marketplace add larsdecker/agents-skills',
  },
  cursor: {
    label: 'Cursor',
    payload: (name) => `.agents/skills/${name}`,
    entry: (name) => `.cursor/rules/${name}.mdc`,
    mode: 'file',
    render: renderCursorRule,
  },
  copilot: {
    label: 'GitHub Copilot',
    payload: (name) => `.agents/skills/${name}`,
    entry: (name) => `.github/instructions/${name}.instructions.md`,
    mode: 'file',
    render: renderCopilotInstructions,
  },
  windsurf: {
    label: 'Windsurf',
    payload: (name) => `.agents/skills/${name}`,
    entry: (name) => `.windsurf/rules/${name}.md`,
    mode: 'file',
    render: renderPlainRule,
  },
  cline: {
    label: 'Cline / Roo Code',
    payload: (name) => `.agents/skills/${name}`,
    entry: (name) => `.clinerules/${name}.md`,
    mode: 'file',
    render: renderPlainRule,
  },
  agents: {
    label: 'AGENTS.md (Codex, Zed, Amp, opencode, Jules, Factory …)',
    payload: (name) => `.agents/skills/${name}`,
    entry: () => 'AGENTS.md',
    mode: 'block',
  },
  gemini: {
    label: 'Gemini CLI',
    payload: (name) => `.agents/skills/${name}`,
    entry: () => 'GEMINI.md',
    mode: 'block',
  },
};

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------

/** Liest die für den Einstiegspunkt nötigen Felder aus der SKILL.md. */
function readSkillMeta(skillDir, fallbackName) {
  const file = path.join(skillDir, 'SKILL.md');
  const raw = fs.readFileSync(file, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  const meta = { name: fallbackName, description: '', when_to_use: '' };
  if (!match) return meta;

  let currentKey = null;
  for (const line of match[1].split('\n')) {
    const keyValue = /^([A-Za-z_-]+):\s*(.*)$/.exec(line);
    if (keyValue) {
      currentKey = keyValue[1];
      meta[currentKey] = stripQuotes(keyValue[2].trim());
      continue;
    }
    // Fortsetzungszeile eines umgebrochenen Werts
    if (currentKey && /^\s+\S/.test(line)) {
      meta[currentKey] = `${meta[currentKey]} ${stripQuotes(line.trim())}`.trim();
    }
  }
  if (!meta.name) meta.name = fallbackName;
  return meta;
}

function stripQuotes(value) {
  return value.replace(/^["'](.*)["']$/s, '$1');
}

// ---------------------------------------------------------------------------
// Einstiegspunkte
// ---------------------------------------------------------------------------

function pointerBody(meta, payloadPath) {
  return `**Vollständige Anleitung: \`${payloadPath}/SKILL.md\` — lies diese Datei, bevor du mit der Aufgabe beginnst.**

${meta.description}

Im Verzeichnis \`${payloadPath}/\` liegen zusätzlich:

- \`references/\` — Kriterien, Vorlagen und Formulierungsmuster, die in der Anleitung referenziert werden
- \`scripts/\` — abhängigkeitsfreie Node-Scripts (Node ≥ 18), die die Messwerte erheben

Führe die Scripts mit dem Pfad relativ zu diesem Projekt aus, zum Beispiel
\`node ${payloadPath}/scripts/<script>.mjs\`. Erfinde keine Ergebnisse, wenn ein Script
nicht ausgeführt werden kann — sage stattdessen, dass die Messung fehlt.`;
}

function renderCursorRule(meta, payloadPath) {
  // Cursor liest .mdc-Dateien mit YAML-Frontmatter. `alwaysApply: false` sorgt
  // dafür, dass die Regel über die Beschreibung ausgewählt wird statt immer im
  // Kontext zu liegen.
  return `---
description: ${meta.description}
alwaysApply: false
---

# ${meta.name}

${pointerBody(meta, payloadPath)}
`;
}

function renderCopilotInstructions(meta, payloadPath) {
  return `---
description: ${meta.description}
applyTo: '**'
---

# ${meta.name}

${pointerBody(meta, payloadPath)}
`;
}

function renderPlainRule(meta, payloadPath) {
  return `# ${meta.name}

${pointerBody(meta, payloadPath)}
`;
}

/** Abschnitt für eine gemeinsame Datei wie AGENTS.md. */
function renderBlockSection(entries) {
  const lines = [
    MARKER_START,
    '',
    '## Agent Skills',
    '',
    'Dieses Projekt enthält Skills: vorbereitete Arbeitsabläufe für wiederkehrende Aufgaben.',
    'Wenn eine Anfrage zu einem der folgenden Punkte passt, lies zuerst die zugehörige',
    'SKILL.md und folge ihr, statt improvisiert vorzugehen.',
    '',
  ];
  for (const { meta, payloadPath } of entries) {
    lines.push(`### ${meta.name}`);
    lines.push('');
    lines.push(`- **Anleitung:** \`${payloadPath}/SKILL.md\``);
    lines.push(`- **Wofür:** ${meta.description}`);
    if (meta.when_to_use) lines.push(`- **Auslöser:** ${meta.when_to_use}`);
    lines.push(`- **Scripts:** \`${payloadPath}/scripts/\` (Node ≥ 18, abhängigkeitsfrei)`);
    lines.push('');
  }
  lines.push('Verwaltet von `install.mjs` aus https://github.com/larsdecker/agents-skills — Änderungen in diesem Abschnitt werden beim nächsten Lauf überschrieben.');
  lines.push('');
  lines.push(MARKER_END);
  return lines.join('\n');
}

/** Ersetzt den verwalteten Abschnitt oder hängt ihn an. Idempotent. */
function upsertBlock(filePath, section) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const startIndex = existing.indexOf(MARKER_START);
  const endIndex = existing.indexOf(MARKER_END);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const before = existing.slice(0, startIndex);
    const after = existing.slice(endIndex + MARKER_END.length);
    return `${before}${section}${after}`;
  }
  const prefix = existing.trim() ? `${existing.replace(/\s*$/, '')}\n\n` : '';
  return `${prefix}${section}\n`;
}

// ---------------------------------------------------------------------------
// Dateisystem
// ---------------------------------------------------------------------------

function copyRecursive(from, to, { dryRun, written }) {
  const entries = fs.readdirSync(from, { withFileTypes: true });
  if (!dryRun) fs.mkdirSync(to, { recursive: true });
  for (const entry of entries) {
    // Claude-spezifische Manifeste gehören nicht in eine Fremdinstallation.
    if (entry.name === '.claude-plugin') continue;
    const source = path.join(from, entry.name);
    const destination = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(source, destination, { dryRun, written });
    } else {
      if (!dryRun) fs.copyFileSync(source, destination);
      written.push(destination);
    }
  }
}

function listSkills() {
  if (!fs.existsSync(skillsRoot)) return [];
  return fs.readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => fs.existsSync(path.join(skillsRoot, entry.name, 'SKILL.md')))
    .map((entry) => entry.name)
    .sort();
}

// ---------------------------------------------------------------------------
// Argumente
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { agent: null, skill: 'all', target: process.cwd(), dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--agent') opts.agent = argv[++i];
    else if (arg === '--skill') opts.skill = argv[++i];
    else if (arg === '--target') opts.target = path.resolve(argv[++i]);
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--list') opts.list = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
  }
  return opts;
}

function printHelp() {
  const agentIds = Object.keys(AGENTS).join(', ');
  process.stdout.write(`install.mjs — Agent Skills in die Konvention eines Coding-Agenten installieren

Verwendung:
  node install.mjs --agent <id> [--skill <name>|all] [--target <verzeichnis>] [--dry-run]
  node install.mjs --list

Optionen:
  --agent <id>     Ziel-Agent: ${agentIds}
  --skill <name>   Einzelner Skill oder "all" (Standard: all)
  --target <dir>   Projektverzeichnis (Standard: aktuelles Verzeichnis)
  --dry-run        Nur anzeigen, was passieren würde
  --list           Verfügbare Skills und Agenten auflisten

Beispiele:
  node install.mjs --agent cursor --skill geo-audit
  node install.mjs --agent agents --target ~/projekte/meine-app
`);
}

function printList() {
  process.stdout.write('Verfügbare Skills:\n');
  for (const name of listSkills()) {
    const meta = readSkillMeta(path.join(skillsRoot, name), name);
    process.stdout.write(`  ${name.padEnd(20)} ${meta.description.slice(0, 80)}\n`);
  }
  process.stdout.write('\nUnterstützte Agenten:\n');
  for (const [id, agent] of Object.entries(AGENTS)) {
    process.stdout.write(`  ${id.padEnd(10)} ${agent.label}\n`);
  }
  process.stdout.write('\nNicht aufgeführter Agent? Die SKILL.md ist einfacher Markdown –\n');
  process.stdout.write('kopiere das Skill-Verzeichnis an einen beliebigen Ort und verweise\n');
  process.stdout.write('in der Anweisungsdatei deines Agenten darauf.\n');
}

// ---------------------------------------------------------------------------
// Ablauf
// ---------------------------------------------------------------------------

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) return printHelp();
  if (opts.list) return printList();

  const available = listSkills();
  if (available.length === 0) {
    process.stderr.write(`Keine Skills in ${skillsRoot} gefunden.\n`);
    process.exit(1);
  }

  if (!opts.agent) {
    process.stderr.write('Fehler: --agent fehlt.\n\n');
    printHelp();
    process.exit(1);
  }
  const agent = AGENTS[opts.agent];
  if (!agent) {
    process.stderr.write(`Fehler: unbekannter Agent "${opts.agent}". Bekannt: ${Object.keys(AGENTS).join(', ')}\n`);
    process.exit(1);
  }

  const selected = opts.skill === 'all' ? available : [opts.skill];
  const unknown = selected.filter((name) => !available.includes(name));
  if (unknown.length > 0) {
    process.stderr.write(`Fehler: unbekannter Skill "${unknown[0]}". Verfügbar: ${available.join(', ')}\n`);
    process.exit(1);
  }

  if (!fs.existsSync(opts.target)) {
    process.stderr.write(`Fehler: Zielverzeichnis existiert nicht: ${opts.target}\n`);
    process.exit(1);
  }

  const written = [];
  const blockEntries = [];

  for (const name of selected) {
    const skillDir = path.join(skillsRoot, name);
    const meta = readSkillMeta(skillDir, name);
    const payloadPath = agent.payload(name);
    const payloadAbsolute = path.join(opts.target, payloadPath);

    copyRecursive(skillDir, payloadAbsolute, { dryRun: opts.dryRun, written });

    if (!agent.entry) continue;

    if (agent.mode === 'block') {
      blockEntries.push({ meta, payloadPath });
      continue;
    }

    const entryPath = path.join(opts.target, agent.entry(name));
    const contents = agent.render(meta, payloadPath);
    if (!opts.dryRun) {
      fs.mkdirSync(path.dirname(entryPath), { recursive: true });
      fs.writeFileSync(entryPath, contents, 'utf8');
    }
    written.push(entryPath);
  }

  if (blockEntries.length > 0) {
    const entryPath = path.join(opts.target, agent.entry());
    const updated = upsertBlock(entryPath, renderBlockSection(blockEntries));
    if (!opts.dryRun) fs.writeFileSync(entryPath, updated, 'utf8');
    written.push(entryPath);
  }

  const prefix = opts.dryRun ? '[dry-run] ' : '';
  process.stdout.write(`${prefix}Agent: ${agent.label}\n`);
  process.stdout.write(`${prefix}Ziel:  ${opts.target}\n\n`);
  for (const file of written) {
    process.stdout.write(`${prefix}  ${path.relative(opts.target, file)}\n`);
  }
  process.stdout.write(`\n${prefix}${written.length} Datei(en), ${selected.length} Skill(s).\n`);
  if (agent.note) process.stdout.write(`\nHinweis: ${agent.note}\n`);
  if (!opts.dryRun && agent.mode === 'block') {
    process.stdout.write('\nDer Abschnitt in der Anweisungsdatei ist mit Markern versehen und wird\n');
    process.stdout.write('bei einem erneuten Lauf ersetzt, nicht dupliziert.\n');
  }
}

main();
