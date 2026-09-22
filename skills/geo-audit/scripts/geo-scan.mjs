#!/usr/bin/env node
/**
 * geo-scan.mjs — erhebt technische Readiness-Signale für GEO-Audits.
 *
 * Führt ausschließlich lesende HTTP-Anfragen aus (GET). Verändert nichts.
 * Keine Abhängigkeiten. Node >= 18 (nutzt globales fetch).
 */

import fs from 'node:fs';

// ---------------------------------------------------------------------------
// Konfiguration
// ---------------------------------------------------------------------------

const USER_AGENT = 'geo-audit-skill/0.1 (+https://lars-decker.eu/skills/geo-audit)';
const REQUEST_TIMEOUT_MS = 15_000;
const POLITENESS_DELAY_MS = 400;

/**
 * KI-Crawler, unterteilt nach Zweck. Die Unterscheidung ist entscheidend:
 * ein Retrieval-Bot in robots.txt auszuschließen kann den Abruf verhindern;
 * tatsächlichen Zugriff des Anbieters belegt dieser Check nicht.
 */
const AI_AGENTS = [
  { name: 'OAI-SearchBot', vendor: 'OpenAI', purpose: 'retrieval', impact: 'hoch' },
  { name: 'ChatGPT-User', vendor: 'OpenAI', purpose: 'retrieval', impact: 'hoch' },
  { name: 'GPTBot', vendor: 'OpenAI', purpose: 'training', impact: 'niedrig' },
  { name: 'Claude-SearchBot', vendor: 'Anthropic', purpose: 'retrieval', impact: 'hoch' },
  { name: 'Claude-User', vendor: 'Anthropic', purpose: 'retrieval', impact: 'hoch' },
  { name: 'ClaudeBot', vendor: 'Anthropic', purpose: 'training', impact: 'niedrig' },
  { name: 'PerplexityBot', vendor: 'Perplexity', purpose: 'retrieval', impact: 'hoch' },
  { name: 'Perplexity-User', vendor: 'Perplexity', purpose: 'retrieval', impact: 'hoch' },
  { name: 'Google-Extended', vendor: 'Google', purpose: 'training (Gemini)', impact: 'niedrig' },
  { name: 'Googlebot', vendor: 'Google', purpose: 'retrieval (auch AI Overviews)', impact: 'kritisch' },
  { name: 'Bingbot', vendor: 'Microsoft', purpose: 'retrieval (auch Copilot)', impact: 'kritisch' },
  { name: 'Applebot-Extended', vendor: 'Apple', purpose: 'training', impact: 'niedrig' },
  { name: 'CCBot', vendor: 'Common Crawl', purpose: 'training', impact: 'niedrig' },
  { name: 'Meta-ExternalAgent', vendor: 'Meta', purpose: 'training', impact: 'niedrig' },
];

/**
 * Satzanfänge, die auf den vorherigen Satz verweisen. Ein Absatz, der so
 * beginnt, ist außerhalb seines Kontexts nicht zitierbar — genau das braucht
 * eine Antwortmaschine aber, wenn sie einen Ausschnitt übernimmt.
 */
const CONTEXT_DEPENDENT_OPENERS = [
  'das', 'dies', 'diese', 'dieser', 'dieses', 'er', 'sie', 'es', 'dabei',
  'dadurch', 'deshalb', 'darum', 'deswegen', 'außerdem', 'zudem', 'trotzdem',
  'somit', 'daher', 'hier', 'dort', 'so', 'genau',
  'it', 'this', 'that', 'these', 'those', 'they', 'he', 'she', 'there',
  'therefore', 'thus', 'however', 'also', 'moreover',
];

const QUESTION_WORDS = [
  'was', 'wie', 'warum', 'wieso', 'wann', 'wer', 'wo', 'welche', 'welcher',
  'welches', 'wofür', 'woran', 'womit', 'weshalb',
  'what', 'how', 'why', 'when', 'who', 'where', 'which',
];

// ---------------------------------------------------------------------------
// Argumente
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { targets: [], maxPages: 5, json: false, out: null, site: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') opts.json = true;
    else if (arg === '--max-pages') opts.maxPages = Number.parseInt(argv[++i], 10) || opts.maxPages;
    else if (arg === '--out') opts.out = argv[++i];
    else if (arg === '--site') opts.site = argv[++i];
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (!arg.startsWith('--')) opts.targets.push(arg);
  }
  return opts;
}

function printHelp() {
  process.stdout.write(`geo-scan.mjs — Auffindbarkeit in KI-Antwortmaschinen prüfen

Verwendung:
  node geo-scan.mjs <url> [weitere urls...] [optionen]
  node geo-scan.mjs --site https://example.com [optionen]

  Ohne --site wird die Herkunft der ersten URL für die Site-Prüfungen genutzt
  (robots.txt, llms.txt, sitemap.xml). Mit --site werden zusätzlich Seiten aus
  der Sitemap gezogen, bis --max-pages erreicht ist.

Optionen:
  --max-pages <n>  Maximale Anzahl geprüfter Seiten (Standard: 5)
  --json           JSON-Ausgabe zusätzlich zur Textzusammenfassung
  --out <datei>    JSON-Ergebnis in Datei schreiben
`);
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
      redirect: 'follow',
      signal: controller.signal,
    });
    const body = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      contentType: response.headers.get('content-type') || '',
      lastModified: response.headers.get('last-modified') || null,
      body,
    };
  } catch (error) {
    return { ok: false, status: 0, error: error.message, body: '', finalUrl: url, contentType: '' };
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// robots.txt
// ---------------------------------------------------------------------------

/**
 * Minimaler robots.txt-Parser. Gruppiert aufeinanderfolgende User-agent-Zeilen
 * und ordnet ihnen die folgenden Regeln zu.
 */
function parseRobots(text) {
  const groups = [];
  let current = null;
  let lastLineWasAgent = false;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === 'user-agent') {
      if (!current || !lastLineWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastLineWasAgent = true;
      continue;
    }
    lastLineWasAgent = false;
    if (!current) continue;
    if (field === 'allow' || field === 'disallow') {
      current.rules.push({ type: field, path: value });
    }
  }
  return groups;
}

/** Ermittelt für einen Agent, ob "/" erlaubt ist. Longest-match wie im Standard. */
function robotsVerdict(groups, agentName) {
  const lower = agentName.toLowerCase();
  const specific = groups.find((group) => group.agents.includes(lower));
  const wildcard = groups.find((group) => group.agents.includes('*'));
  const group = specific || wildcard;
  if (!group) return { allowed: true, source: 'keine Regel', rule: null };

  let best = null;
  for (const rule of group.rules) {
    if (rule.type === 'disallow' && rule.path === '') continue; // "Disallow:" leer = alles erlaubt
    if (rule.path === '/' || rule.path === '' || rule.path === '*') {
      if (!best || rule.path.length >= best.path.length) best = rule;
      continue;
    }
    // Regeln für Unterpfade beeinflussen den Zugriff auf "/" nicht.
  }
  const source = specific ? `eigene Regel für ${agentName}` : 'Wildcard-Regel (*)';
  if (!best) return { allowed: true, source, rule: null };
  return { allowed: best.type === 'allow', source, rule: `${best.type}: ${best.path}` };
}

// ---------------------------------------------------------------------------
// HTML-Auswertung
// ---------------------------------------------------------------------------

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchAll(html, pattern) {
  return [...html.matchAll(pattern)];
}

/**
 * Grenzt den Hauptinhalt ein, bevor Text ausgewertet wird.
 *
 * Ohne diesen Schritt landen Navigation, Karten-Teaser und Footer im Textkorpus.
 * Diese Fragmente enthalten keine Satzzeichen und werden von der
 * Satzsegmentierung zu einem einzigen sehr langen "Satz" verschmolzen — die
 * Kennzahlen zur Satzlänge werden dadurch unbrauchbar.
 */
function extractMainContent(html) {
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html);
  if (main) return { html: main[1], source: 'main' };

  const articles = matchAll(html, /<article\b[^>]*>([\s\S]*?)<\/article>/gi);
  if (articles.length > 0) {
    // Bei Übersichtsseiten mit vielen Teaser-Artikeln alle zusammenfassen.
    return { html: articles.map((match) => match[1]).join('\n'), source: 'article' };
  }

  const withoutChrome = html
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ');
  return { html: withoutChrome, source: 'body ohne nav/header/footer' };
}

function extractTag(html, tag) {
  const match = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(html);
  return match ? stripTags(match[1]) : null;
}

function extractMeta(html, nameOrProperty) {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${nameOrProperty}["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+property=["']${nameOrProperty}["'][^>]*>`, 'i'),
  ];
  for (const pattern of patterns) {
    const tag = pattern.exec(html);
    if (!tag) continue;
    const content = /content=["']([\s\S]*?)["']/i.exec(tag[0]);
    if (content) return stripTags(content[1]);
  }
  return null;
}

function extractJsonLd(html) {
  const blocks = matchAll(html, /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const parsed = [];
  const errors = [];
  for (const block of blocks) {
    try {
      parsed.push(JSON.parse(block[1].trim()));
    } catch (error) {
      errors.push(error.message);
    }
  }
  return { parsed, errors, blockCount: blocks.length };
}

/** Flacht @graph-Strukturen und Arrays zu einer Liste von Entitäten ab. */
function flattenEntities(jsonLd) {
  const entities = [];
  const walk = (node) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node['@graph'])) {
      node['@graph'].forEach(walk);
      return;
    }
    if (node['@type']) entities.push(node);
  };
  jsonLd.forEach(walk);
  return entities;
}

function typeNames(entity) {
  const type = entity['@type'];
  return Array.isArray(type) ? type.map(String) : [String(type)];
}

function extractHeadings(html) {
  const headings = [];
  for (const level of [1, 2, 3]) {
    for (const match of matchAll(html, new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)</h${level}>`, 'gi'))) {
      const text = stripTags(match[1]);
      if (text) headings.push({ level, text, index: match.index });
    }
  }
  return headings.sort((a, b) => a.index - b.index).map(({ level, text }) => ({ level, text }));
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ„"])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 25);
}

function firstWord(sentence) {
  const cleaned = sentence.replace(/^[„"'»(\-–—\s]+/, '');
  const match = /^([\p{L}]+)/u.exec(cleaned);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Bewertet, wie gut sich der Text in Ausschnitten zitieren lässt.
 * Antwortmaschinen übernehmen Absätze, nicht Seiten — ein Absatz, der ohne
 * seinen Vorgänger unverständlich ist, wird seltener übernommen.
 */
function analyzeQuotability(text) {
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return {
      sentences: 0, contextDependentShare: 0, averageWords: 0,
      longSentenceShare: 0, withFigureShare: 0,
    };
  }
  let contextDependent = 0;
  let longSentences = 0;
  let withFigure = 0;
  let totalWords = 0;

  for (const sentence of sentences) {
    if (CONTEXT_DEPENDENT_OPENERS.includes(firstWord(sentence))) contextDependent += 1;
    const words = sentence.split(/\s+/).length;
    totalWords += words;
    if (words > 35) longSentences += 1;
    if (/\d/.test(sentence)) withFigure += 1;
  }

  const share = (value) => Math.round((value / sentences.length) * 100);
  return {
    sentences: sentences.length,
    contextDependentShare: share(contextDependent),
    averageWords: Math.round(totalWords / sentences.length),
    longSentenceShare: share(longSentences),
    withFigureShare: share(withFigure),
  };
}

/**
 * Unterscheidet Artikelseiten von Übersichtsseiten.
 *
 * Auf einer Übersichtsseite besteht der Text aus Teaser-Fragmenten ohne
 * Satzzeichen. Kennzahlen zur Satzqualität sind dort systematisch verzerrt und
 * dürfen nicht als Befund gemeldet werden — sonst produziert der Scan
 * Empfehlungen, die auf Listenseiten sinnlos sind.
 */
function classifyPageKind({ words, internalLinksInMain, h2Count }) {
  if (words < 120) return 'kurz';
  const linkDensity = internalLinksInMain / Math.max(1, words / 100);
  if (linkDensity > 3) return 'übersicht';
  if (h2Count >= 10 && words / h2Count < 60) return 'übersicht';
  return 'artikel';
}

function analyzePage(url, response) {
  if (!response.ok) {
    return { url, ok: false, status: response.status, error: response.error || `HTTP ${response.status}` };
  }
  const html = response.body;
  const main = extractMainContent(html);
  const text = stripTags(main.html);
  const headings = extractHeadings(html);
  const { parsed: jsonLd, errors: jsonLdErrors, blockCount } = extractJsonLd(html);
  const entities = flattenEntities(jsonLd);
  const allTypes = entities.flatMap(typeNames);

  const origin = new URL(response.finalUrl).origin;
  const links = matchAll(html, /<a\b[^>]+href=["']([^"']+)["']/gi).map((match) => match[1]);
  const externalLinks = links.filter((href) => /^https?:\/\//i.test(href) && !href.startsWith(origin));
  const linksInMain = matchAll(main.html, /<a\b[^>]+href=["']([^"']+)["']/gi).map((match) => match[1]);
  const internalLinksInMain = linksInMain.filter((href) => !/^https?:\/\//i.test(href) || href.startsWith(origin)).length;

  const canonicalMatch = /<link[^>]+rel=["']canonical["'][^>]*>/i.exec(html);
  const canonical = canonicalMatch ? (/href=["']([^"']+)["']/i.exec(canonicalMatch[0]) || [])[1] || null : null;
  const langMatch = /<html\b[^>]*\blang=["']([^"']+)["']/i.exec(html);

  const questionHeadings = headings.filter(({ text: heading }) => {
    if (heading.includes('?')) return true;
    return QUESTION_WORDS.includes(firstWord(heading));
  });

  // Erster Absatz nach der H1 — die Stelle, aus der Antwortmaschinen am häufigsten zitieren.
  const h1Index = main.html.search(/<h1\b/i);
  const afterH1 = h1Index === -1 ? main.html : main.html.slice(h1Index);
  const firstParagraphMatch = /<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(afterH1);
  const firstParagraph = firstParagraphMatch ? stripTags(firstParagraphMatch[1]) : null;

  const dateModified = entities.map((entity) => entity.dateModified).find(Boolean) || null;
  const datePublished = entities.map((entity) => entity.datePublished).find(Boolean) || null;

  const words = text.split(/\s+/).filter(Boolean).length;
  const pageKind = classifyPageKind({
    words,
    internalLinksInMain,
    h2Count: headings.filter((heading) => heading.level === 2).length,
  });

  return {
    url: response.finalUrl,
    ok: true,
    status: response.status,
    lang: langMatch ? langMatch[1] : null,
    title: extractTag(html, 'title'),
    titleLength: (extractTag(html, 'title') || '').length,
    metaDescription: extractMeta(html, 'description'),
    metaDescriptionLength: (extractMeta(html, 'description') || '').length,
    canonical,
    words,
    contentSource: main.source,
    pageKind,
    headings: {
      h1: headings.filter((heading) => heading.level === 1).map((heading) => heading.text),
      h2Count: headings.filter((heading) => heading.level === 2).length,
      h3Count: headings.filter((heading) => heading.level === 3).length,
      questionHeadings: questionHeadings.map((heading) => heading.text),
      outline: headings.slice(0, 25),
    },
    structuredData: {
      blockCount,
      parseErrors: jsonLdErrors,
      types: [...new Set(allTypes)],
      entityCount: entities.length,
      withId: entities.filter((entity) => entity['@id']).length,
      hasPersonOrOrganization: allTypes.some((type) => type === 'Person' || type === 'Organization'),
      hasAuthor: entities.some((entity) => entity.author),
      hasFaqPage: allTypes.includes('FAQPage'),
      hasBreadcrumb: allTypes.includes('BreadcrumbList'),
      datePublished,
      dateModified,
    },
    extractableStructures: {
      lists: matchAll(html, /<(ul|ol)\b/gi).length,
      tables: matchAll(html, /<table\b/gi).length,
      definitionLists: matchAll(html, /<dl\b/gi).length,
    },
    citations: {
      externalLinks: externalLinks.length,
      externalDomains: [...new Set(externalLinks.map((href) => {
        try { return new URL(href).hostname; } catch { return null; }
      }).filter(Boolean))].length,
    },
    firstParagraph: firstParagraph ? {
      text: firstParagraph.slice(0, 400),
      words: firstParagraph.split(/\s+/).filter(Boolean).length,
      startsContextDependent: CONTEXT_DEPENDENT_OPENERS.includes(firstWord(firstParagraph)),
    } : null,
    quotability: analyzeQuotability(text),
    httpLastModified: response.lastModified,
  };
}

// ---------------------------------------------------------------------------
// llms.txt
// ---------------------------------------------------------------------------

function analyzeLlmsTxt(response) {
  if (!response.ok) {
    return { present: false, status: response.status };
  }
  // Eine SPA liefert für fehlende Pfade oft HTML mit Status 200.
  if (/<html/i.test(response.body)) {
    return { present: false, status: response.status, note: 'Antwort ist HTML, keine Markdown-Datei' };
  }
  const body = response.body;
  const lines = body.split('\n');
  const links = matchAll(body, /\[[^\]]+\]\([^)]+\)/g).length;
  return {
    present: true,
    status: response.status,
    bytes: Buffer.byteLength(body, 'utf8'),
    hasH1: /^#\s+\S/m.test(body),
    hasBlockquoteSummary: /^>\s+\S/m.test(body),
    sectionCount: lines.filter((line) => /^##\s+\S/.test(line)).length,
    linkCount: links,
    contentType: response.contentType,
  };
}

// ---------------------------------------------------------------------------
// Bewertung
// ---------------------------------------------------------------------------

function buildFindings(result) {
  const findings = [];
  const add = (severity, area, text, fix) => findings.push({ severity, evidence: 'OBSERVED', area, text, fix });

  // Zugang
  for (const agent of result.site.crawlers) {
    if (agent.allowed) continue;
    if (agent.impact === 'kritisch' || agent.impact === 'hoch') {
      add('kritisch', 'Zugang',
        `${agent.name} (${agent.vendor}, ${agent.purpose}) ist per robots.txt ausgeschlossen (${agent.rule || agent.source}).`,
        'Prüfen, ob der Ausschluss beabsichtigt ist. robots.txt zeigt die veröffentlichte Crawl-Regel, nicht den tatsächlichen Zugriff des Anbieter-Crawlers.');
    }
  }
  if (!result.site.robots.present) {
    add('hinweis', 'Zugang', 'Keine robots.txt gefunden.',
      'Kein Fehler, aber eine explizite robots.txt mit Sitemap-Verweis ist die verlässlichere Variante.');
  } else if (!result.site.robots.hasSitemapDirective) {
    add('mittel', 'Zugang', 'robots.txt enthält keinen Sitemap-Verweis.',
      'Zeile "Sitemap: <url>" ergänzen.');
  }

  // llms.txt
  if (!result.site.llmsTxt.present) {
    add('experimentell', 'Auffindbarkeit', 'Keine llms.txt vorhanden.',
      'Nur als klar gekennzeichnetes Experiment erwägen; sie ist keine Voraussetzung für GEO-Sichtbarkeit.');
  } else {
    if (!result.site.llmsTxt.hasH1) {
      add('experimentell', 'Auffindbarkeit', 'llms.txt hat keine H1-Überschrift.', 'Nur relevant, falls das experimentelle Dateiformat bewusst genutzt wird.');
    }
    if (!result.site.llmsTxt.hasBlockquoteSummary) {
      add('experimentell', 'Auffindbarkeit', 'llms.txt hat keine Kurzbeschreibung als Blockquote.',
        'Nur relevant, falls das experimentelle Dateiformat bewusst genutzt wird.');
    }
    if (result.site.llmsTxt.linkCount === 0) {
      add('experimentell', 'Auffindbarkeit', 'llms.txt enthält keine Links.',
        'Nur relevant, falls das experimentelle Dateiformat bewusst genutzt wird.');
    }
  }
  if (!result.site.sitemap.present) {
    add('hinweis', 'Auffindbarkeit', 'Keine sitemap.xml erreichbar.', 'Bei einer größeren oder schwer intern auffindbaren Site eine Sitemap veröffentlichen und aktuell halten.');
  }

  // Seitenebene
  for (const page of result.pages) {
    if (!page.ok) {
      add(page.status === 0 ? 'hinweis' : 'kritisch', 'Zugang', `${page.url} im Scan nicht abrufbar (${page.error}).`,
        page.status === 0
          ? 'Netzwerk, DNS, TLS und lokale Ausführungsumgebung prüfen; dieser Fehler belegt nicht allein, dass die Website für Anbieter-Crawler unerreichbar ist.'
          : 'Erreichbarkeit und mögliche Netzwerk-, CDN- oder WAF-Regeln prüfen.');
      continue;
    }
    const label = new URL(page.url).pathname || '/';

    // Prosa-Kriterien nur auf Artikelseiten. Auf Übersichtsseiten besteht der
    // Text aus Teaser-Fragmenten — Satzkennzahlen sind dort nicht aussagekräftig.
    const isProse = page.pageKind === 'artikel';

    if (page.structuredData.blockCount === 0) {
      add('opportunity', 'Entity-Klarheit', `${label}: keine JSON-LD-Strukturdaten.`,
        'Nur ergänzen, wenn strukturierte Daten konkrete, sichtbare Inhalte korrekt abbilden; fehlendes JSON-LD ist kein GEO-Blocker.');
    } else {
      if (page.structuredData.parseErrors.length > 0) {
        add('opportunity', 'Entity-Klarheit', `${label}: JSON-LD ist nicht parsebar (${page.structuredData.parseErrors[0]}).`,
          'Syntax korrigieren, wenn die Seite auf dieses Markup angewiesen ist; sichtbare Inhalte separat bewerten.');
      }
      if (!page.structuredData.hasPersonOrOrganization) {
        add('opportunity', 'Entity-Klarheit', `${label}: keine Person- oder Organization-Entität.`,
          'Sichtbare Angaben zu Autor und Betreiber auf Klarheit und Konsistenz prüfen; Markup nur bei passendem Inhalt erwägen.');
      }
      if (page.structuredData.entityCount > 1 && page.structuredData.withId === 0) {
        add('mittel', 'Entity-Klarheit', `${label}: ${page.structuredData.entityCount} Entitäten ohne @id.`,
          'Über @id verknüpfen, damit die Entitäten als ein Graph erkennbar sind statt als lose Fragmente.');
      }
      if (!page.structuredData.dateModified) {
        add('hinweis', 'Aktualität', `${label}: kein dateModified in den Strukturdaten.`,
          'Nur bei tatsächlich zeitabhängigem Inhalt ein echtes Änderungsdatum sichtbar und gegebenenfalls im Markup ausweisen.');
      }
    }

    if (page.headings.h1.length === 0) {
      add('mittel', 'Struktur', `${label}: keine H1.`, 'Eine eindeutige H1 setzen.');
    } else if (page.headings.h1.length > 1) {
      add('hinweis', 'Struktur', `${label}: ${page.headings.h1.length} H1-Überschriften.`,
        'Auf eine reduzieren, damit das Hauptthema eindeutig ist.');
    }

    if (isProse && page.words > 400 && page.headings.questionHeadings.length === 0) {
      add('hinweis', 'Struktur', `${label}: keine Überschrift im Frageformat.`,
        'Nur prüfen, ob Überschriften die tatsächliche Nutzerintention klar wiedergeben; Frageform ist keine Pflicht.');
    }

    if (isProse && page.words > 400 && page.extractableStructures.lists + page.extractableStructures.tables === 0) {
      add('hinweis', 'Struktur', `${label}: keine Listen oder Tabellen.`,
        'Listen oder Tabellen nur dort erwägen, wo Inhalte ihrer Natur nach Aufzählungen oder Vergleiche sind.');
    }

    if (isProse && page.quotability.contextDependentShare >= 30) {
      add('mittel', 'Zitierfähigkeit',
        `${label}: ${page.quotability.contextDependentShare} % der Sätze beginnen mit einem Rückverweis ("Das", "Dies", "Er" …).`,
        'Betroffene Sätze so umschreiben, dass sie das Subjekt benennen. Ein Satz, der ohne seinen Vorgänger unverständlich ist, wird nicht zitiert.');
    }
    if (isProse && page.quotability.longSentenceShare >= 25) {
      add('hinweis', 'Zitierfähigkeit',
        `${label}: ${page.quotability.longSentenceShare} % der Sätze sind länger als 35 Wörter.`,
        'Lange Sätze teilen. Kurze, vollständige Aussagen sind leichter als Ganzes übernehmbar.');
    }
    if (isProse && page.firstParagraph?.startsContextDependent) {
      add('mittel', 'Zitierfähigkeit', `${label}: erster Absatz beginnt mit einem Rückverweis.`,
        'Der erste Absatz nach der H1 ist die häufigste Zitatquelle. Er muss die Kernaussage eigenständig enthalten.');
    }
    if (isProse && page.firstParagraph && page.firstParagraph.words < 15 && page.words > 400) {
      add('hinweis', 'Zitierfähigkeit', `${label}: erster Absatz ist sehr kurz (${page.firstParagraph.words} Wörter).`,
        'Direkt nach der H1 eine vollständige Antwort auf die Kernfrage der Seite formulieren.');
    }

    if (!page.canonical) {
      add('hinweis', 'Auffindbarkeit', `${label}: kein Canonical-Link.`, 'Canonical setzen.');
    }
    if (!page.lang) {
      add('mittel', 'Entity-Klarheit', `${label}: kein lang-Attribut am html-Element.`,
        'lang setzen — bei mehrsprachigen Antworten entscheidet das über die Zuordnung.');
    }
    if (isProse && page.words > 600 && page.citations.externalDomains === 0) {
      add('hinweis', 'Zitierfähigkeit', `${label}: keine externen Quellen verlinkt.`,
        'Belege verlinken. Seiten mit nachvollziehbaren Quellen werden als verlässlicher eingeordnet.');
    }
    if (!page.metaDescription) {
      add('hinweis', 'Auffindbarkeit', `${label}: keine Meta-Description.`, 'Ergänzen.');
    }
  }

  const order = { kritisch: 0, opportunity: 1, mittel: 2, hinweis: 3, experimentell: 4 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);
  return findings;
}

// ---------------------------------------------------------------------------
// Ablauf
// ---------------------------------------------------------------------------

async function collectSitemapUrls(origin, limit) {
  const response = await fetchText(`${origin}/sitemap.xml`);
  if (!response.ok) return { present: false, urls: [] };
  const urls = matchAll(response.body, /<loc>\s*([^<\s]+)\s*<\/loc>/gi).map((match) => match[1]);
  const nested = urls.filter((url) => /sitemap.*\.xml$/i.test(url));
  let pageUrls = urls.filter((url) => !/\.xml$/i.test(url));

  if (pageUrls.length === 0 && nested.length > 0) {
    const inner = await fetchText(nested[0]);
    if (inner.ok) {
      pageUrls = matchAll(inner.body, /<loc>\s*([^<\s]+)\s*<\/loc>/gi)
        .map((match) => match[1])
        .filter((url) => !/\.xml$/i.test(url));
    }
  }
  return { present: true, total: pageUrls.length, urls: pageUrls.slice(0, limit) };
}

async function run(opts) {
  const firstTarget = opts.site || opts.targets[0];
  if (!firstTarget) {
    printHelp();
    process.exit(1);
  }
  const normalized = /^https?:\/\//i.test(firstTarget) ? firstTarget : `https://${firstTarget}`;
  const origin = new URL(normalized).origin;

  const robotsResponse = await fetchText(`${origin}/robots.txt`);
  const robotsGroups = robotsResponse.ok && !/<html/i.test(robotsResponse.body)
    ? parseRobots(robotsResponse.body)
    : [];
  const crawlers = AI_AGENTS.map((agent) => ({
    ...agent,
    ...robotsVerdict(robotsGroups, agent.name),
  }));

  const llmsResponse = await fetchText(`${origin}/llms.txt`);
  const llmsTxt = analyzeLlmsTxt(llmsResponse);

  let pageUrls = opts.targets.filter((target) => /^https?:\/\//i.test(target));
  const sitemap = await collectSitemapUrls(origin, opts.maxPages);
  if (pageUrls.length === 0) {
    pageUrls = sitemap.urls.length > 0 ? sitemap.urls : [normalized];
  }
  pageUrls = pageUrls.slice(0, opts.maxPages);

  const pages = [];
  for (const url of pageUrls) {
    const response = await fetchText(url);
    pages.push(analyzePage(url, response));
    await sleep(POLITENESS_DELAY_MS);
  }

  const result = {
    meta: {
      origin,
      generatedAt: new Date().toISOString(),
      pagesChecked: pages.length,
      userAgent: USER_AGENT,
      caveats: [
        'Nur HTML aus der Server-Antwort. Inhalte, die erst clientseitig gerendert werden, sind für die meisten KI-Crawler ebenfalls nicht sichtbar — das Ergebnis spiegelt insofern deren Sicht.',
        'Zitierfähigkeit ist eine sprachliche Heuristik, kein Ranking-Signal. Sie zeigt, wie gut Absätze eigenständig funktionieren.',
        'robots.txt-Auswertung bezieht sich auf den Pfad "/". Regeln für Unterpfade sind nicht berücksichtigt.',
        'Kein Zugriff auf Server-Logs: ob KI-Crawler die Seite tatsächlich abrufen, lässt sich nur dort verifizieren.',
      ],
    },
    site: {
      robots: {
        present: robotsResponse.ok && !/<html/i.test(robotsResponse.body),
        status: robotsResponse.status,
        hasSitemapDirective: /^\s*sitemap\s*:/im.test(robotsResponse.body || ''),
      },
      crawlers,
      llmsTxt,
      sitemap: { present: sitemap.present, urlCount: sitemap.total ?? 0 },
    },
    pages,
  };
  result.findings = buildFindings(result);
  return result;
}

// ---------------------------------------------------------------------------
// Textausgabe
// ---------------------------------------------------------------------------

function renderText(result) {
  const lines = [];
  lines.push('GEO-AUDIT');
  lines.push(`Origin: ${result.meta.origin}`);
  lines.push(`Geprüfte Seiten: ${result.meta.pagesChecked}`);
  lines.push('');

  lines.push('KI-CRAWLER-ZUGANG (robots.txt)');
  if (!result.site.robots.present) {
    lines.push('  keine robots.txt gefunden — keine robots.txt-Einschränkung erkannt');
  }
  const blocked = result.site.crawlers.filter((agent) => !agent.allowed);
  if (blocked.length === 0) {
    lines.push('  robots.txt erlaubt den geprüften Agenten "/"; tatsächlicher Anbieterzugriff ist damit nicht belegt');
  } else {
    for (const agent of blocked) {
      lines.push(`  BLOCKIERT  ${pad(agent.name, 20)} ${agent.vendor} · ${agent.purpose} · Auswirkung: ${agent.impact}`);
      lines.push(`             Quelle: ${agent.source}${agent.rule ? ` (${agent.rule})` : ''}`);
    }
  }
  lines.push('');

  lines.push('SITE-DATEIEN');
  const llms = result.site.llmsTxt;
  lines.push(`  llms.txt:     ${llms.present
    ? `vorhanden (${llms.bytes} Bytes, ${llms.sectionCount} Abschnitte, ${llms.linkCount} Links)`
    : `nicht vorhanden${llms.note ? ` — ${llms.note}` : ''}`}`);
  lines.push(`  sitemap.xml:  ${result.site.sitemap.present ? `vorhanden (${result.site.sitemap.urlCount} URLs)` : 'nicht vorhanden'}`);
  lines.push(`  robots.txt:   ${result.site.robots.present ? `vorhanden${result.site.robots.hasSitemapDirective ? ', mit Sitemap-Verweis' : ', ohne Sitemap-Verweis'}` : 'nicht vorhanden'}`);
  lines.push('');

  lines.push('SEITEN');
  for (const page of result.pages) {
    if (!page.ok) {
      lines.push(`  ${page.url} — FEHLER: ${page.error}`);
      continue;
    }
    const path = new URL(page.url).pathname;
    lines.push(`  ${path}`);
    lines.push(`      Wörter: ${page.words} · H2/H3: ${page.headings.h2Count}/${page.headings.h3Count} · Fragen-Überschriften: ${page.headings.questionHeadings.length}`);
    lines.push(`      JSON-LD: ${page.structuredData.blockCount} Block/Blöcke · Typen: ${page.structuredData.types.join(', ') || 'keine'}`);
    lines.push(`      Entitäten: ${page.structuredData.entityCount}, davon ${page.structuredData.withId} mit @id · dateModified: ${page.structuredData.dateModified || 'fehlt'}`);
    lines.push(`      Struktur: ${page.extractableStructures.lists} Listen, ${page.extractableStructures.tables} Tabellen · externe Domains: ${page.citations.externalDomains}`);
    lines.push(`      Zitierfähigkeit: ${page.quotability.sentences} Sätze, ø ${page.quotability.averageWords} Wörter, `
      + `${page.quotability.contextDependentShare} % mit Rückverweis, ${page.quotability.longSentenceShare} % über 35 Wörter, `
      + `${page.quotability.withFigureShare} % mit Zahl`);
    lines.push(`      Textquelle: ${page.contentSource} · Seitentyp: ${page.pageKind}`
      + `${page.pageKind === 'artikel' ? '' : ' (Prosa-Kriterien nicht angewandt)'}`);
  }
  lines.push('');

  lines.push('BEFUNDE');
  if (result.findings.length === 0) {
    lines.push('  keine');
  } else {
    for (const finding of result.findings) {
      lines.push(`  [${finding.severity.toUpperCase()}] ${finding.area}: ${finding.text}`);
      lines.push(`      -> ${finding.fix}`);
    }
  }
  lines.push('');

  lines.push('HINWEISE ZUR INTERPRETATION');
  for (const caveat of result.meta.caveats) lines.push(`  - ${caveat}`);

  return lines.join('\n');
}

function pad(value, width) {
  return String(value).padEnd(width);
}

// ---------------------------------------------------------------------------
// Einstiegspunkt
// ---------------------------------------------------------------------------

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  printHelp();
} else {
  const result = await run(opts);
  const text = renderText(result);
  if (opts.out) {
    fs.writeFileSync(opts.out, JSON.stringify(result, null, 2), 'utf8');
    process.stdout.write(`${text}\n\nJSON geschrieben: ${opts.out}\n`);
  } else if (opts.json) {
    process.stdout.write(`${text}\n\n--- JSON ---\n${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${text}\n`);
  }
}
