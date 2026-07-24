#!/usr/bin/env node
/**
 * scan-repo.mjs — sammelt messbare Signale für ein Tech-Debt-Register.
 *
 * Liest ausschließlich: `git log`, `git ls-files`, `git grep` und Dateiinhalte.
 * Schreibt nichts ins Repository (Ausnahme: explizites --out).
 *
 * Keine Abhängigkeiten. Node >= 18.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Konfiguration
// ---------------------------------------------------------------------------

const CODE_EXTENSIONS = new Set([
  'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'mts', 'cts',
  'py', 'rb', 'go', 'rs', 'java', 'kt', 'kts', 'scala', 'groovy',
  'cs', 'fs', 'vb', 'php', 'swift', 'm', 'mm',
  'c', 'h', 'cpp', 'cxx', 'cc', 'hpp', 'hxx', 'hh',
  'ex', 'exs', 'erl', 'clj', 'cljs', 'dart', 'lua', 'pl', 'r',
  'vue', 'svelte', 'astro',
  'css', 'scss', 'sass', 'less', 'styl',
  'sql', 'graphql', 'gql', 'proto',
  'sh', 'bash', 'zsh', 'ps1',
]);

const CONFIG_EXTENSIONS = new Set([
  'yaml', 'yml', 'toml', 'tf', 'hcl', 'gradle', 'cmake', 'mk',
]);

const EXCLUDED_DIR_SEGMENTS = [
  'node_modules', 'dist', 'build', 'out', '.next', '.nuxt', '.svelte-kit',
  'vendor', 'target', 'coverage', '__pycache__', '.venv', 'venv',
  'bower_components', 'third_party', 'thirdparty', 'generated', 'gen',
  'migrations', 'snapshots', '__snapshots__', '.terraform',
];

const EXCLUDED_FILE_PATTERNS = [
  /(^|\/)[^/]*\.min\.(js|css)$/,
  /(^|\/)[^/]*\.lock$/,
  /(^|\/)[^/]*-lock\.json$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)yarn\.lock$/,
  /(^|\/)poetry\.lock$/,
  /(^|\/)Cargo\.lock$/,
  /(^|\/)composer\.lock$/,
  /(^|\/)[^/]*\.d\.ts$/,
  /(^|\/)[^/]*\.generated\.[^/]+$/,
  /(^|\/)[^/]*_pb2?\.py$/,
  /(^|\/)[^/]*\.pb\.go$/,
];

const TEST_PATH_HINTS = [
  /(^|\/)tests?(\/|$)/i,
  /(^|\/)__tests__(\/|$)/,
  /(^|\/)spec(\/|$)/i,
  /(^|\/)e2e(\/|$)/i,
  /(^|\/)cypress(\/|$)/i,
];

const TEST_FILE_PATTERNS = [
  /\.(test|spec)\.[^.]+$/i,
  /_test\.[^.]+$/i,
  /^test_[^/]+$/i,
  /Tests?\.[^.]+$/,
];

const MARKER_PATTERN = /\b(TODO|FIXME|HACK|XXX|WORKAROUND|@deprecated|@ts-ignore|@ts-expect-error|eslint-disable|noqa|nolint)\b/gi;

const MAX_FILE_BYTES = 1_500_000;   // größere Dateien werden nur gezählt, nicht gelesen
const MAX_FILES_TO_READ = 400;      // Obergrenze für Marker-/LOC-Lesevorgänge
const MAX_FILES_PER_COMMIT_FOR_COUPLING = 15;
const MAX_ORPHAN_REF_CHECKS = 20;

/**
 * Dateien, die per Konvention von Framework, Buildsystem oder Runtime geladen
 * werden. Sie erscheinen nie als Import im Code und sind deshalb keine
 * Verwaist-Kandidaten, auch wenn niemand sie namentlich referenziert.
 */
const CONVENTION_ENTRYPOINT_BASENAMES = new Set([
  // Next.js / App-Router-Konventionen
  'page', 'layout', 'route', 'template', 'default', 'loading', 'error',
  'global-error', 'not-found', 'middleware', 'instrumentation',
  'opengraph-image', 'twitter-image', 'icon', 'apple-icon', 'sitemap', 'robots', 'manifest',
  // allgemeine Einstiegspunkte
  'index', 'main', 'app', 'server', 'cli', 'setup', 'conftest',
  '__init__', '__main__', 'mod', 'lib',
]);

const CONVENTION_ENTRYPOINT_PATTERNS = [
  /(^|\/)[^/]*\.config\.[^/]+$/,        // *.config.js|ts|mjs
  /(^|\/)\.[^/]+rc(\.[^/]+)?$/,         // .eslintrc, .prettierrc.json
  /(^|\/)\.gitlab-ci\.ya?ml$/,
  /(^|\/)\.github\//,
  /(^|\/)Dockerfile[^/]*$/,
  /(^|\/)docker-compose[^/]*\.ya?ml$/,
  /(^|\/)Makefile$/,
  /(^|\/)[^/]*\.tf$/,                   // Terraform lädt ganze Verzeichnisse
];

// Trennzeichen des git-log-Formats, als Escape statt literalem Steuerzeichen.
const COMMIT_MARKER = '\u0001';
const FIELD_MARKER = '\u0002';

// ---------------------------------------------------------------------------
// Argumente
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    since: '12m',
    top: 25,
    path: null,
    json: false,
    out: null,
    repo: process.cwd(),
  };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') opts.json = true;
    else if (arg === '--since') opts.since = argv[++i];
    else if (arg === '--top') opts.top = Number.parseInt(argv[++i], 10) || opts.top;
    else if (arg === '--path') opts.path = argv[++i];
    else if (arg === '--out') opts.out = argv[++i];
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (!arg.startsWith('--')) rest.push(arg);
  }
  if (rest.length > 0) opts.repo = path.resolve(rest[0]);
  return opts;
}

function printHelp() {
  process.stdout.write(`scan-repo.mjs — Signale für ein Tech-Debt-Register

Verwendung:
  node scan-repo.mjs [pfad-zum-repo] [optionen]

Optionen:
  --since <wert>   Zeitfenster der Churn-Analyse: 6m, 12m, 2y oder ISO-Datum (Standard: 12m)
  --top <n>        Anzahl Hotspots in der Ausgabe (Standard: 25)
  --path <pfad>    Analyse auf ein Unterverzeichnis begrenzen
  --json           JSON-Ausgabe zusätzlich zur Textzusammenfassung
  --out <datei>    Ergebnis in Datei schreiben statt nach stdout
`);
}

/** Wandelt 12m / 2y / ISO-Datum in ein von git verstandenes --since um. */
function normalizeSince(value) {
  const relative = /^(\d+)\s*([dwmy])$/i.exec(value.trim());
  if (!relative) return value;
  const amount = relative[1];
  const unit = { d: 'days', w: 'weeks', m: 'months', y: 'years' }[relative[2].toLowerCase()];
  return `${amount} ${unit} ago`;
}

// ---------------------------------------------------------------------------
// Git-Helfer
// ---------------------------------------------------------------------------

function git(repo, args, { allowFailure = false } = {}) {
  try {
    return execFileSync('git', ['-C', repo, ...args], {
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    if (allowFailure) return '';
    throw error;
  }
}

function assertGitRepo(repo) {
  try {
    execFileSync('git', ['-C', repo, 'rev-parse', '--is-inside-work-tree'], { stdio: 'ignore' });
  } catch {
    process.stderr.write(
      `Fehler: ${repo} ist kein Git-Repository.\n`
      + 'Ohne Git-Historie fehlt die Churn-Dimension. Der Skill muss dann ohne Änderungshäufigkeit arbeiten.\n',
    );
    process.exit(2);
  }
}

// ---------------------------------------------------------------------------
// Dateiklassifikation
// ---------------------------------------------------------------------------

function extensionOf(file) {
  const base = path.basename(file);
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : '';
}

function isExcluded(file) {
  const segments = file.split('/');
  if (segments.some((segment) => EXCLUDED_DIR_SEGMENTS.includes(segment))) return true;
  if (segments.includes('public') && segments.includes('data')) return true;
  return EXCLUDED_FILE_PATTERNS.some((pattern) => pattern.test(file));
}

function classify(file) {
  const ext = extensionOf(file);
  if (CODE_EXTENSIONS.has(ext)) return 'code';
  if (CONFIG_EXTENSIONS.has(ext)) return 'config';
  if (/^Dockerfile/.test(path.basename(file))) return 'config';
  return null;
}

function isTestFile(file) {
  const base = path.basename(file);
  if (TEST_FILE_PATTERNS.some((pattern) => pattern.test(base))) return true;
  return TEST_PATH_HINTS.some((pattern) => pattern.test(file));
}

/** True, wenn die Datei per Konvention geladen wird und kein Import nötig ist. */
function isConventionEntrypoint(file) {
  const base = path.basename(file).replace(/\.[^.]+$/, '');
  if (CONVENTION_ENTRYPOINT_BASENAMES.has(base.toLowerCase())) return true;
  return CONVENTION_ENTRYPOINT_PATTERNS.some((pattern) => pattern.test(file));
}

/** Normalisierter Name für die Zuordnung Quelldatei -> Testdatei. */
function testKey(file) {
  let base = path.basename(file);
  base = base.replace(/\.[^.]+$/, '');
  base = base.replace(/\.(test|spec)$/i, '');
  base = base.replace(/_test$/i, '');
  base = base.replace(/^test_/i, '');
  base = base.replace(/Tests?$/, '');
  return base.toLowerCase();
}

// ---------------------------------------------------------------------------
// Churn aus git log
// ---------------------------------------------------------------------------

/** Löst Rename-Notationen von --numstat auf und gibt den Zielpfad zurück. */
function resolveRenamedPath(raw) {
  if (!raw.includes('=>')) return raw;
  const braced = /^(.*)\{(.*) => (.*)\}(.*)$/.exec(raw);
  if (braced) {
    const [, prefix, , to, suffix] = braced;
    return path.posix.normalize(`${prefix}${to}${suffix}`).replace(/^\.\//, '');
  }
  const parts = raw.split(' => ');
  return parts[parts.length - 1].trim();
}

function collectChurn(repo, since, pathFilter) {
  const args = [
    'log',
    `--since=${normalizeSince(since)}`,
    '--no-merges',
    '--numstat',
    '--format=%x01%H%x02%an%x02%aI',
  ];
  if (pathFilter) args.push('--', pathFilter);

  const raw = git(repo, args, { allowFailure: true });
  const files = new Map();
  const coupling = new Map();
  let commitCount = 0;
  let firstCommitDate = null;
  let lastCommitDate = null;
  let currentAuthor = null;
  let currentDate = null;
  let currentFiles = [];

  const flushCommit = () => {
    if (currentFiles.length === 0) return;
    if (currentFiles.length <= MAX_FILES_PER_COMMIT_FOR_COUPLING) {
      const unique = [...new Set(currentFiles)].sort();
      for (let i = 0; i < unique.length; i += 1) {
        for (let j = i + 1; j < unique.length; j += 1) {
          const key = `${unique[i]} ${unique[j]}`;
          coupling.set(key, (coupling.get(key) || 0) + 1);
        }
      }
    }
    currentFiles = [];
  };

  for (const line of raw.split('\n')) {
    if (line.startsWith(COMMIT_MARKER)) {
      flushCommit();
      const [, author, date] = line.slice(1).split(FIELD_MARKER);
      currentAuthor = author || 'unbekannt';
      currentDate = date || null;
      commitCount += 1;
      if (currentDate) {
        if (!lastCommitDate || currentDate > lastCommitDate) lastCommitDate = currentDate;
        if (!firstCommitDate || currentDate < firstCommitDate) firstCommitDate = currentDate;
      }
      continue;
    }
    if (!line.trim()) continue;

    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const [addedRaw, deletedRaw] = parts;
    const file = resolveRenamedPath(parts.slice(2).join('\t'));
    if (!file || isExcluded(file) || !classify(file)) continue;

    let entry = files.get(file);
    if (!entry) {
      entry = { commits: 0, added: 0, deleted: 0, authors: new Set(), lastChange: null };
      files.set(file, entry);
    }
    entry.commits += 1;
    entry.added += Number.parseInt(addedRaw, 10) || 0;
    entry.deleted += Number.parseInt(deletedRaw, 10) || 0;
    entry.authors.add(currentAuthor);
    if (currentDate && (!entry.lastChange || currentDate > entry.lastChange)) {
      entry.lastChange = currentDate;
    }
    currentFiles.push(file);
  }
  flushCommit();

  return { files, coupling, commitCount, firstCommitDate, lastCommitDate };
}

// ---------------------------------------------------------------------------
// Dateiinhalte
// ---------------------------------------------------------------------------

function readFileStats(repo, file) {
  const absolute = path.join(repo, file);
  let stat;
  try {
    stat = fs.statSync(absolute);
  } catch {
    return null;
  }
  if (!stat.isFile()) return null;
  if (stat.size > MAX_FILE_BYTES) {
    return { loc: null, bytes: stat.size, markers: {}, markerCount: 0, tooLarge: true };
  }

  let content;
  try {
    content = fs.readFileSync(absolute);
  } catch {
    return null;
  }
  if (content.includes(0)) return null; // binär

  const text = content.toString('utf8');
  const loc = text.length === 0 ? 0 : text.split('\n').filter((line) => line.trim().length > 0).length;

  const markers = {};
  let markerCount = 0;
  for (const match of text.matchAll(MARKER_PATTERN)) {
    const key = match[1].toUpperCase();
    markers[key] = (markers[key] || 0) + 1;
    markerCount += 1;
  }

  return { loc, bytes: stat.size, markers, markerCount, tooLarge: false };
}

// ---------------------------------------------------------------------------
// Analyse
// ---------------------------------------------------------------------------

function analyze(opts) {
  const repo = opts.repo;
  assertGitRepo(repo);

  const trackedRaw = git(repo, ['ls-files', '-z']);
  const tracked = trackedRaw.split('\0').filter(Boolean);

  const relevant = tracked.filter((file) => {
    if (isExcluded(file) || !classify(file)) return false;
    if (opts.path && !file.startsWith(opts.path.replace(/^\.\//, '').replace(/\/$/, '') + '/')) return false;
    return true;
  });

  const testFiles = relevant.filter(isTestFile);
  const sourceFiles = relevant.filter((file) => !isTestFile(file));

  const testIndex = new Map();
  for (const file of testFiles) {
    const key = testKey(file);
    if (!testIndex.has(key)) testIndex.set(key, []);
    testIndex.get(key).push(file);
  }

  const churn = collectChurn(repo, opts.since, opts.path);

  // Kandidaten für Dateilesevorgänge: alles mit Churn, plus die größten Quelldateien.
  const churnedSources = sourceFiles.filter((file) => churn.files.has(file));
  const byChurn = [...churnedSources].sort(
    (a, b) => (churn.files.get(b)?.commits || 0) - (churn.files.get(a)?.commits || 0),
  );
  const candidates = new Set(byChurn.slice(0, MAX_FILES_TO_READ));

  const stats = new Map();
  for (const file of candidates) {
    const info = readFileStats(repo, file);
    if (info) stats.set(file, info);
  }

  const maxCommits = Math.max(1, ...[...candidates].map((f) => churn.files.get(f)?.commits || 0));
  const maxLoc = Math.max(1, ...[...stats.values()].map((s) => s.loc || 0));

  const hotspots = [];
  for (const file of candidates) {
    const entry = churn.files.get(file);
    const info = stats.get(file);
    if (!entry || !info || info.loc === null) continue;

    const churnNorm = entry.commits / maxCommits;
    const sizeNorm = info.loc / maxLoc;
    const score = Math.round(churnNorm * sizeNorm * 1000) / 10;
    const key = testKey(file);
    const matchingTests = testIndex.get(key) || [];

    hotspots.push({
      file,
      type: classify(file),
      score,
      commits: entry.commits,
      authors: entry.authors.size,
      authorNames: [...entry.authors].slice(0, 5),
      linesAdded: entry.added,
      linesDeleted: entry.deleted,
      loc: info.loc,
      lastChange: entry.lastChange ? entry.lastChange.slice(0, 10) : null,
      hasTest: matchingTests.length > 0,
      testFiles: matchingTests.slice(0, 3),
      markers: info.markers,
      markerCount: info.markerCount,
    });
  }

  hotspots.sort((a, b) => b.score - a.score);
  const top = hotspots.slice(0, opts.top);

  // Gesamtzahl der Autoren im Fenster — entscheidet, ob Bus-Faktor überhaupt eine Aussage ist.
  const allAuthors = new Set();
  for (const entry of churn.files.values()) {
    for (const author of entry.authors) allAuthors.add(author);
  }

  // Wissensrisiko: viel Churn, ein Autor. In Ein-Personen-Repos ist das keine
  // Erkenntnis, sondern eine Eigenschaft des Projekts.
  const churnMedian = median(hotspots.map((h) => h.commits));
  const soloRepository = allAuthors.size <= 1;
  const knowledgeRisk = soloRepository ? [] : hotspots
    .filter((h) => h.authors === 1 && h.commits > Math.max(3, churnMedian))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 15)
    .map(({ file, commits, authorNames, loc, lastChange }) => ({
      file, commits, author: authorNames[0], loc, lastChange,
    }));

  // Teure Kombination: Hotspot ohne Test. Wenn das Repo überhaupt keine Tests
  // hat, ist die Einzelliste wertlos — dann ist die fehlende Testinfrastruktur
  // der eine strukturelle Befund.
  const noTestInfrastructure = testFiles.length === 0;
  const untestedHotspots = noTestInfrastructure ? [] : hotspots
    .filter((h) => !h.hasTest && h.commits >= 3)
    .slice(0, 15)
    .map(({ file, score, commits, loc }) => ({ file, score, commits, loc }));

  // Änderungskopplung
  const couplingFindings = [];
  for (const [key, count] of churn.coupling) {
    if (count < 5) continue;
    const [a, b] = key.split(' ');
    const aCommits = churn.files.get(a)?.commits || 0;
    const bCommits = churn.files.get(b)?.commits || 0;
    const minCommits = Math.min(aCommits, bCommits);
    if (minCommits === 0) continue;
    const ratio = count / minCommits;
    if (ratio < 0.5) continue;
    const sameDir = path.dirname(a) === path.dirname(b);
    couplingFindings.push({
      files: [a, b],
      together: count,
      ratio: Math.round(ratio * 100),
      sameDirectory: sameDir,
    });
  }
  couplingFindings.sort((x, y) => y.together - x.together || y.ratio - x.ratio);

  // Verwaiste Kandidaten: im Fenster nicht geändert
  const untouched = sourceFiles.filter((file) => !churn.files.has(file));
  const orphanCandidates = [];
  for (const file of untouched.slice(0, MAX_ORPHAN_REF_CHECKS * 4)) {
    if (orphanCandidates.length >= MAX_ORPHAN_REF_CHECKS) break;
    if (isConventionEntrypoint(file)) continue;
    const base = path.basename(file).replace(/\.[^.]+$/, '');
    if (base.length < 4) continue;
    const hits = git(repo, ['grep', '-l', '--fixed-strings', base, '--', ':!' + file], { allowFailure: true })
      .split('\n')
      .filter(Boolean);
    if (hits.length === 0) {
      const info = readFileStats(repo, file);
      orphanCandidates.push({ file, loc: info?.loc ?? null, referencedElsewhere: false });
    }
  }

  const markerTotals = {};
  for (const info of stats.values()) {
    for (const [key, count] of Object.entries(info.markers)) {
      markerTotals[key] = (markerTotals[key] || 0) + count;
    }
  }

  return {
    meta: {
      repository: repo,
      generatedAt: new Date().toISOString(),
      window: { since: opts.since, resolved: normalizeSince(opts.since) },
      pathFilter: opts.path || null,
      scoreFormula: 'score = (commits / maxCommits) * (loc / maxLoc) * 100 — Churn mal Größe, beides auf das Maximum im Fenster normalisiert',
      caveats: [
        'Nur versionierte Dateien mit Code- oder Konfigurationsendung. Generierte Verzeichnisse, Lockfiles und Migrations sind ausgeschlossen.',
        'LOC zählt nicht-leere Zeilen, ohne Kommentare abzuziehen.',
        'Testzuordnung ist eine Namensheuristik. Eine fehlende Zuordnung ist ein Prüfhinweis, kein Beweis für fehlende Tests.',
        'Autorenzahl basiert auf Commit-Metadaten und unterschätzt Pair Programming.',
      ],
    },
    summary: {
      trackedRelevantFiles: relevant.length,
      sourceFiles: sourceFiles.length,
      testFiles: testFiles.length,
      authorsInWindow: allAuthors.size,
      soloRepository,
      noTestInfrastructure,
      testToSourceRatio: sourceFiles.length ? Math.round((testFiles.length / sourceFiles.length) * 100) / 100 : 0,
      commitsInWindow: churn.commitCount,
      filesChangedInWindow: churn.files.size,
      filesUntouchedInWindow: untouched.length,
      firstCommitInWindow: churn.firstCommitDate ? churn.firstCommitDate.slice(0, 10) : null,
      lastCommitInWindow: churn.lastCommitDate ? churn.lastCommitDate.slice(0, 10) : null,
      markerTotals,
    },
    hotspots: top,
    knowledgeRisk,
    untestedHotspots,
    changeCoupling: couplingFindings.slice(0, 15),
    orphanCandidates,
  };
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ---------------------------------------------------------------------------
// Textausgabe
// ---------------------------------------------------------------------------

function renderText(result) {
  const lines = [];
  const s = result.summary;

  lines.push('TECH-DEBT-SCAN');
  lines.push(`Repository: ${result.meta.repository}`);
  lines.push(`Zeitfenster: ${result.meta.window.since} (${s.firstCommitInWindow || '?'} bis ${s.lastCommitInWindow || '?'})`);
  lines.push('');
  lines.push('ÜBERBLICK');
  lines.push(`  Relevante Dateien:        ${s.trackedRelevantFiles} (${s.sourceFiles} Quell-, ${s.testFiles} Testdateien)`);
  lines.push(`  Verhältnis Test/Quelle:   ${s.testToSourceRatio}`);
  lines.push(`  Commits im Fenster:       ${s.commitsInWindow} von ${s.authorsInWindow} Autor(en)`);
  lines.push(`  Davon berührte Dateien:   ${s.filesChangedInWindow}`);
  lines.push(`  Im Fenster unberührt:     ${s.filesUntouchedInWindow}`);
  const markerLine = Object.entries(s.markerTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => `${key}=${count}`)
    .join(', ');
  lines.push(`  Marker in gelesenen Dateien: ${markerLine || 'keine'}`);
  lines.push('');

  lines.push(`HOTSPOTS (Churn x Größe, Top ${result.hotspots.length})`);
  if (result.hotspots.length === 0) {
    lines.push('  keine — im Zeitfenster wurden keine passenden Dateien geändert');
  } else {
    lines.push('  Score  Commits  Autoren  LOC     Test  Datei');
    for (const h of result.hotspots) {
      lines.push(
        `  ${pad(h.score.toFixed(1), 6)} ${pad(h.commits, 8)} ${pad(h.authors, 8)} ${pad(h.loc, 7)} `
        + `${pad(h.hasTest ? 'ja' : 'NEIN', 5)} ${h.file}`,
      );
    }
  }
  lines.push('');

  lines.push('HOTSPOTS OHNE ERKENNBARE TESTDATEI');
  if (result.summary.noTestInfrastructure) {
    lines.push('  Im Repository wurde keine einzige Testdatei gefunden.');
    lines.push('  Eine Einzelauflistung wäre hier irreführend: der Befund ist nicht');
    lines.push('  "diese Dateien haben keine Tests", sondern "das Projekt hat keine');
    lines.push('  Testinfrastruktur". Das ist ein struktureller Eintrag, kein Datei-Eintrag.');
  } else if (result.untestedHotspots.length === 0) {
    lines.push('  keine');
  } else {
    for (const h of result.untestedHotspots) {
      lines.push(`  ${h.file} — ${h.commits} Commits, ${h.loc} LOC, Score ${h.score.toFixed(1)}`);
    }
  }
  lines.push('');

  lines.push('WISSENSRISIKO (hoher Churn, ein Autor)');
  if (result.summary.soloRepository) {
    lines.push('  Nicht bewertbar: im Zeitfenster hat nur eine Person committet.');
    lines.push('  Bus-Faktor ist hier eine Eigenschaft des Projekts, kein Befund.');
  } else if (result.knowledgeRisk.length === 0) {
    lines.push('  keine auffälligen Dateien');
  } else {
    for (const k of result.knowledgeRisk) {
      lines.push(`  ${k.file} — ${k.commits} Commits, alle von ${k.author}, ${k.loc} LOC`);
    }
  }
  lines.push('');

  lines.push('ÄNDERUNGSKOPPLUNG (häufig gemeinsam geändert)');
  if (result.changeCoupling.length === 0) {
    lines.push('  keine auffälligen Paare');
  } else {
    for (const c of result.changeCoupling) {
      const marker = c.sameDirectory ? '' : '  [verschiedene Verzeichnisse]';
      lines.push(`  ${c.together}x gemeinsam (${c.ratio}% der Änderungen)${marker}`);
      lines.push(`      ${c.files[0]}`);
      lines.push(`      ${c.files[1]}`);
    }
  }
  lines.push('');

  lines.push('MÖGLICHERWEISE VERWAIST (unberührt im Fenster, kein Namenstreffer im Repo)');
  if (result.orphanCandidates.length === 0) {
    lines.push('  keine');
  } else {
    for (const o of result.orphanCandidates) {
      lines.push(`  ${o.file} — ${o.loc ?? '?'} LOC`);
    }
  }
  lines.push('');

  lines.push('HINWEISE ZUR INTERPRETATION');
  for (const caveat of result.meta.caveats) lines.push(`  - ${caveat}`);

  return lines.join('\n');
}

function pad(value, width) {
  return String(value).padStart(width);
}

// ---------------------------------------------------------------------------
// Einstiegspunkt
// ---------------------------------------------------------------------------

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const result = analyze(opts);
  const text = renderText(result);
  const payload = opts.json ? `${text}\n\n--- JSON ---\n${JSON.stringify(result, null, 2)}\n` : `${text}\n`;

  if (opts.out) {
    fs.writeFileSync(opts.out, opts.json ? JSON.stringify(result, null, 2) : text, 'utf8');
    process.stdout.write(`${text}\n\nErgebnis geschrieben: ${opts.out}\n`);
  } else {
    process.stdout.write(payload);
  }
}

main();
