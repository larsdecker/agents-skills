#!/usr/bin/env node
/**
 * seo-scan.mjs — technischer SEO-Check gegen ein festes Regelwerk.
 *
 * Prüft ausschließlich, was maschinell überprüfbar ist. Bewertungen, die
 * Suchintention oder inhaltliche Tiefe betreffen, bleiben dem Agenten
 * überlassen — siehe SKILL.md.
 *
 * Führt nur lesende HTTP-Anfragen aus (GET, HEAD). Verändert nichts.
 * Keine Abhängigkeiten. Node >= 18.
 */

import fs from 'node:fs';

const USER_AGENT = 'seo-check-skill/0.1 (+https://lars-decker.eu/skills/seo-check)';
const REQUEST_TIMEOUT_MS = 15_000;
const POLITENESS_DELAY_MS = 350;

// Schwellwerte an einer Stelle, damit sie überprüfbar und änderbar bleiben.
const LIMITS = {
  titleMin: 30,
  titleIdealMin: 50,
  titleIdealMax: 60,
  titlePixelBudget: 600,
  descMin: 120,
  descIdealMin: 150,
  descIdealMax: 160,
  altMax: 125,
  imageBytesMax: 300 * 1024,
  ogImageBytesMax: 5 * 1024 * 1024,
  ogImageMinSide: 300,
  robotsTxtBytesMax: 500 * 1024,
  sitemapUrlsMax: 50_000,
  sitemapBytesMax: 50 * 1024 * 1024,
  sentenceWordsIdealMin: 15,
  sentenceWordsIdealMax: 20,
  fleschIdealMin: 60,
  fleschIdealMax: 70,
  maxRedirectHops: 1,
  urlDepthMax: 4,
};

const GENERIC_TITLES = [
  'home', 'startseite', 'index', 'untitled', 'unbenannt', 'products', 'produkte',
  'page', 'seite', 'welcome', 'willkommen', 'document', 'new page',
];

const GENERIC_ANCHORS = [
  'hier', 'hier klicken', 'klicken sie hier', 'mehr', 'mehr lesen', 'weiterlesen',
  'mehr erfahren', 'weitere informationen', 'link', 'this link', 'details',
  'click here', 'read more', 'learn more', 'more', 'here', 'see more', 'continue',
];

const STOP_WORDS_IN_URL = [
  'der', 'die', 'das', 'und', 'oder', 'von', 'zu', 'mit', 'fuer', 'ein', 'eine',
  'a', 'an', 'the', 'and', 'or', 'of', 'to', 'for', 'with', 'in', 'on',
];

const VALID_ROBOTS_DIRECTIVES = new Set([
  'index', 'noindex', 'follow', 'nofollow', 'none', 'all', 'noarchive',
  'nosnippet', 'notranslate', 'noimageindex', 'nositelinkssearchbox', 'indexifembedded',
]);

/** Pflicht- und Empfehlungsfelder je Schema-Typ für Rich Results. */
const SCHEMA_REQUIREMENTS = {
  Article: { required: ['headline', 'author', 'datePublished', 'image', 'publisher'] },
  NewsArticle: { required: ['headline', 'author', 'datePublished', 'image', 'publisher'] },
  BlogPosting: { required: ['headline', 'author', 'datePublished', 'image', 'publisher'] },
  Product: { required: ['name'], oneOf: ['offers', 'review', 'aggregateRating'] },
  Recipe: { required: ['name', 'image', 'recipeIngredient', 'recipeInstructions'] },
  FAQPage: { required: ['mainEntity'] },
  LocalBusiness: { required: ['name', 'address'] },
  Organization: { required: ['name', 'url'] },
  Event: { required: ['name', 'startDate', 'location'] },
  BreadcrumbList: { required: ['itemListElement'] },
};

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

async function request(url, method = 'GET') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method,
      headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
      redirect: 'manual',
      signal: controller.signal,
    });
    const body = method === 'GET' && response.status < 300 ? await response.text() : '';
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      location: response.headers.get('location'),
      contentType: response.headers.get('content-type') || '',
      contentLength: Number.parseInt(response.headers.get('content-length') || '', 10) || null,
      xRobotsTag: response.headers.get('x-robots-tag'),
      linkHeader: response.headers.get('link'),
      body,
      url,
    };
  } catch (error) {
    return { ok: false, status: 0, error: error.message, body: '', url };
  } finally {
    clearTimeout(timer);
  }
}

/** Folgt Redirects manuell, um die Kette messen zu können. */
async function requestFollowing(url, maxHops = 6) {
  const chain = [];
  let current = url;
  for (let hop = 0; hop < maxHops; hop += 1) {
    const response = await request(current, 'GET');
    chain.push({ url: current, status: response.status });
    if (response.status >= 300 && response.status < 400 && response.location) {
      current = new URL(response.location, current).href;
      continue;
    }
    return { ...response, chain, finalUrl: current };
  }
  return { ok: false, status: 0, error: 'zu viele Redirects', chain, finalUrl: current, body: '' };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// HTML-Hilfsfunktionen
// ---------------------------------------------------------------------------

function matchAll(html, pattern) {
  return [...html.matchAll(pattern)];
}

function headSection(html) {
  const match = /<head\b[^>]*>([\s\S]*?)<\/head>/i.exec(html);
  return match ? match[1] : html;
}

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

function attr(tag, name) {
  const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s">]+))`, 'i').exec(tag);
  if (!match) return null;
  return match[2] ?? match[3] ?? match[4] ?? null;
}

function mainContent(html) {
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html);
  if (main) return main[1];
  const article = /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(html);
  if (article) return article[1];
  return html
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ');
}

/**
 * Näherung der Darstellungsbreite in Pixel. Google kürzt nach Pixelbreite,
 * nicht nach Zeichen: schmale Zeichen wie "i" oder "l" brauchen deutlich
 * weniger Platz als "W" oder "M". Die Gewichte sind eine Schätzung für eine
 * ~16px-Serifenlose und ersetzen keine echte Textmessung.
 */
function estimatePixelWidth(text) {
  let width = 0;
  for (const char of text) {
    if ('iljI.,:;\'`!|'.includes(char)) width += 4;
    else if ('ftr()[]{}-/\\ '.includes(char)) width += 6;
    else if ('WM@%'.includes(char)) width += 14;
    else if (char === char.toUpperCase() && char !== char.toLowerCase()) width += 11;
    else width += 8.5;
  }
  return Math.round(width);
}

// ---------------------------------------------------------------------------
// Lesbarkeit
// ---------------------------------------------------------------------------

function countSyllables(word, german) {
  const lower = word.toLowerCase().replace(/[^a-zäöüß]/g, '');
  if (!lower) return 0;
  // Vokalgruppen zählen; Diphthonge gelten als eine Silbe.
  const groups = lower.match(german ? /[aeiouäöüy]+/g : /[aeiouy]+/g);
  let count = groups ? groups.length : 0;
  if (!german && lower.endsWith('e') && count > 1) count -= 1; // stummes e
  return Math.max(1, count);
}

/**
 * Flesch Reading Ease. Für Deutsch die Amstad-Variante — die englische Formel
 * auf deutschen Text angewandt liefert systematisch zu niedrige Werte, weil
 * deutsche Wörter länger sind.
 */
function readability(text, lang) {
  const german = /^de/i.test(lang || '');
  const sentences = text.split(/[.!?]+(?=\s|$)/).map((s) => s.trim()).filter((s) => s.length > 3);
  const words = text.split(/\s+/).filter((w) => /[a-zA-ZäöüÄÖÜß]/.test(w));
  if (sentences.length === 0 || words.length === 0) {
    return { words: words.length, sentences: sentences.length, wordsPerSentence: 0, flesch: null, formula: null };
  }
  const syllables = words.reduce((sum, word) => sum + countSyllables(word, german), 0);
  const asl = words.length / sentences.length;
  const asw = syllables / words.length;
  const flesch = german
    ? 180 - asl - 58.5 * asw
    : 206.835 - 1.015 * asl - 84.6 * asw;
  return {
    words: words.length,
    sentences: sentences.length,
    wordsPerSentence: Math.round(asl * 10) / 10,
    flesch: Math.round(flesch * 10) / 10,
    formula: german ? 'Flesch-Amstad (Deutsch)' : 'Flesch Reading Ease (Englisch)',
  };
}

// ---------------------------------------------------------------------------
// robots.txt
// ---------------------------------------------------------------------------

function parseRobots(text) {
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  const sitemaps = [];
  const issues = [];

  text.split('\n').forEach((rawLine, index) => {
    const withoutComment = rawLine.replace(/#.*$/, '');
    const line = withoutComment.trim();
    if (!line) return;
    const separator = line.indexOf(':');
    if (separator === -1) {
      issues.push(`Zeile ${index + 1}: kein Doppelpunkt, Direktive nicht erkennbar ("${line.slice(0, 40)}")`);
      return;
    }
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === 'sitemap') {
      sitemaps.push(value);
      if (!/^https?:\/\//i.test(value)) {
        issues.push(`Zeile ${index + 1}: Sitemap-Verweis muss eine absolute URL sein`);
      }
      return;
    }
    if (field === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      return;
    }
    lastWasAgent = false;
    // Nicht standardisiert, aber verbreitet und harmlos: nicht als Problem melden.
    const TOLERATED = ['host', 'content-signal', 'clean-param', 'noindex', 'request-rate', 'visit-time'];
    if (!['disallow', 'allow', 'crawl-delay'].includes(field)) {
      if (!TOLERATED.includes(field)) {
        issues.push(`Zeile ${index + 1}: unbekannte Direktive "${field}"`);
      }
      return;
    }
    if (!current) {
      issues.push(`Zeile ${index + 1}: "${field}" steht vor jeder User-agent-Zeile und wird ignoriert`);
      return;
    }
    if (field !== 'crawl-delay') current.rules.push({ type: field, path: value });
  });

  return { groups, sitemaps, issues };
}

/** Prüft nach Longest-Match, ob ein Pfad für Googlebot erlaubt ist. */
function isAllowed(groups, pathname) {
  const specific = groups.find((group) => group.agents.includes('googlebot'));
  const wildcard = groups.find((group) => group.agents.includes('*'));
  const group = specific || wildcard;
  if (!group) return { allowed: true, rule: null };

  let best = null;
  for (const rule of group.rules) {
    if (rule.path === '') continue;
    const pattern = rule.path
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\$$/, '$');
    if (!new RegExp(`^${pattern}`).test(pathname)) continue;
    if (!best || rule.path.length > best.path.length) best = rule;
  }
  if (!best) return { allowed: true, rule: null };
  return { allowed: best.type === 'allow', rule: `${best.type}: ${best.path}` };
}

// ---------------------------------------------------------------------------
// Seitenanalyse
// ---------------------------------------------------------------------------

function analyzeTitles(head) {
  const tags = matchAll(head, /<title\b[^>]*>([\s\S]*?)<\/title>/gi);
  const text = tags.length > 0 ? stripTags(tags[0][1]) : null;
  return {
    count: tags.length,
    text,
    length: text ? text.length : 0,
    pixelWidth: text ? estimatePixelWidth(text) : 0,
    generic: text ? GENERIC_TITLES.includes(text.trim().toLowerCase()) : false,
  };
}

function analyzeDescription(head) {
  const tags = matchAll(head, /<meta\b[^>]*>/gi)
    .map((match) => match[0])
    .filter((tag) => (attr(tag, 'name') || '').toLowerCase() === 'description');
  const text = tags.length > 0 ? (attr(tags[0], 'content') || '').trim() : null;
  return { count: tags.length, text, length: text ? text.length : 0 };
}

function analyzeCanonical(head, linkHeader) {
  const tags = matchAll(head, /<link\b[^>]*>/gi)
    .map((match) => match[0])
    .filter((tag) => (attr(tag, 'rel') || '').toLowerCase().split(/\s+/).includes('canonical'));
  const hrefs = tags.map((tag) => attr(tag, 'href')).filter(Boolean);
  const fromHeader = linkHeader && /rel\s*=\s*"?canonical"?/i.test(linkHeader)
    ? (/<([^>]+)>/.exec(linkHeader) || [])[1] || null
    : null;
  const href = hrefs[0] || fromHeader;
  return {
    count: hrefs.length + (fromHeader ? 1 : 0),
    href,
    hrefs,
    fromHeader: Boolean(fromHeader),
    absolute: href ? /^https?:\/\//i.test(href) : false,
    hasUppercase: href ? /[A-Z]/.test(href.replace(/^https?:\/\//i, '')) : false,
  };
}

function analyzeRobotsMeta(head, xRobotsTag) {
  const tags = matchAll(head, /<meta\b[^>]*>/gi)
    .map((match) => match[0])
    .filter((tag) => {
      const name = (attr(tag, 'name') || '').toLowerCase();
      return name === 'robots' || name === 'googlebot' || name === 'bingbot';
    });
  const directives = [];
  const unknown = [];
  for (const tag of tags) {
    for (const raw of (attr(tag, 'content') || '').split(',')) {
      const directive = raw.trim().toLowerCase();
      if (!directive) continue;
      directives.push(directive);
      const base = directive.split(':')[0];
      if (!VALID_ROBOTS_DIRECTIVES.has(base)) unknown.push(directive);
    }
  }
  const headerDirectives = (xRobotsTag || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  const all = [...directives, ...headerDirectives];
  return {
    tagCount: tags.length,
    directives,
    headerDirectives,
    unknown,
    noindex: all.some((d) => d === 'noindex' || d === 'none'),
    nofollow: all.some((d) => d === 'nofollow' || d === 'none'),
    conflicting: all.includes('index') && all.includes('noindex'),
  };
}

function analyzeHeadings(html) {
  const found = [];
  for (let level = 1; level <= 6; level += 1) {
    for (const match of matchAll(html, new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)</h${level}>`, 'gi'))) {
      found.push({ level, text: stripTags(match[1]), index: match.index });
    }
  }
  found.sort((a, b) => a.index - b.index);

  const skips = [];
  let previous = 0;
  for (const heading of found) {
    if (previous > 0 && heading.level > previous + 1) {
      skips.push(`H${previous} → H${heading.level} ("${heading.text.slice(0, 40)}")`);
    }
    previous = heading.level;
  }
  const texts = found.map((h) => h.text.trim().toLowerCase()).filter(Boolean);
  const duplicates = texts.filter((text, index) => texts.indexOf(text) !== index);

  return {
    h1: found.filter((h) => h.level === 1).map((h) => h.text),
    counts: Object.fromEntries([1, 2, 3, 4, 5, 6].map((l) => [`h${l}`, found.filter((h) => h.level === l).length])),
    empty: found.filter((h) => !h.text.trim()).map((h) => `h${h.level}`),
    skips,
    duplicates: [...new Set(duplicates)],
    outline: found.slice(0, 30).map(({ level, text }) => ({ level, text })),
  };
}

function analyzeImages(html) {
  const tags = matchAll(html, /<img\b[^>]*>/gi).map((match) => match[0]);
  const images = tags.map((tag, index) => {
    const src = attr(tag, 'src') || attr(tag, 'data-src') || '';
    const altRaw = /\balt\s*=/i.test(tag) ? (attr(tag, 'alt') ?? '') : null;
    const file = src.split('/').pop()?.split('?')[0] || '';
    return {
      position: index,
      src,
      file,
      altPresent: altRaw !== null,
      altEmpty: altRaw !== null && altRaw.trim() === '',
      altLength: altRaw ? altRaw.length : 0,
      hasWidth: Boolean(attr(tag, 'width')),
      hasHeight: Boolean(attr(tag, 'height')),
      lazy: (attr(tag, 'loading') || '').toLowerCase() === 'lazy',
      hasSrcset: Boolean(attr(tag, 'srcset')),
      badFilename: /[A-Z]/.test(file) || file.includes('_') || /^(img|dsc|photo|image)[-_]?\d+/i.test(file),
      format: (file.split('.').pop() || '').toLowerCase(),
    };
  });
  return images;
}

function analyzeLinks(html, pageUrl) {
  const origin = new URL(pageUrl).origin;
  const tags = matchAll(html, /<a\b[^>]*>([\s\S]*?)<\/a>/gi);
  const links = [];
  for (const match of tags) {
    const tag = match[0].slice(0, match[0].indexOf('>') + 1);
    const href = attr(tag, 'href');
    if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href)) continue;
    let absolute;
    try {
      absolute = new URL(href, pageUrl).href;
    } catch {
      continue;
    }
    const rel = (attr(tag, 'rel') || '').toLowerCase().split(/\s+/).filter(Boolean);
    const anchor = stripTags(match[1]);
    links.push({
      href: absolute,
      internal: absolute.startsWith(origin),
      anchor,
      anchorGeneric: GENERIC_ANCHORS.includes(anchor.trim().toLowerCase()),
      anchorEmpty: anchor.trim().length === 0,
      rel,
      targetBlank: (attr(tag, 'target') || '').toLowerCase() === '_blank',
      hasParams: absolute.includes('?'),
    });
  }
  return links;
}

function analyzeHreflang(head) {
  const tags = matchAll(head, /<link\b[^>]*>/gi)
    .map((match) => match[0])
    .filter((tag) => attr(tag, 'hreflang'));
  return tags.map((tag) => {
    const code = attr(tag, 'hreflang') || '';
    const href = attr(tag, 'href') || '';
    const lower = code.toLowerCase();
    const errors = [];
    if (code.includes('_')) errors.push('Unterstrich statt Bindestrich');
    if (!/^https?:\/\//i.test(href)) errors.push('href ist nicht absolut');
    if (lower !== 'x-default') {
      const parts = lower.split('-');
      if (!/^[a-z]{2,3}$/.test(parts[0])) errors.push('kein gültiger ISO-639-1-Sprachcode');
      if (parts.length > 2) errors.push('zu viele Bestandteile');
      if (parts.length === 2) {
        if (!/^[a-z]{2}$/.test(parts[1])) errors.push('kein gültiger ISO-3166-1-Regionscode');
        if (parts[1] === 'uk') errors.push('"uk" ist kein Ländercode für Großbritannien, korrekt ist "gb"');
        if (parts[1] === 'eu') errors.push('"eu" ist kein ISO-3166-1-Ländercode');
      }
    }
    return { code, href, isDefault: lower === 'x-default', errors };
  });
}

function analyzeSocial(head) {
  const metas = matchAll(head, /<meta\b[^>]*>/gi).map((match) => match[0]);
  const og = {};
  const twitter = {};
  const wrongAttribute = [];

  for (const tag of metas) {
    const property = attr(tag, 'property');
    const name = attr(tag, 'name');
    const content = attr(tag, 'content') || '';
    const key = (property || name || '').toLowerCase();
    if (key.startsWith('og:')) {
      og[key] = content;
      if (!property) wrongAttribute.push(`${key} nutzt name= statt property=`);
    } else if (key.startsWith('twitter:')) {
      twitter[key] = content;
      if (!name) wrongAttribute.push(`${key} nutzt property= statt name=`);
    }
  }
  return { og, twitter, wrongAttribute };
}

function flattenJsonLd(nodes) {
  const entities = [];
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node['@graph'])) return node['@graph'].forEach(walk);
    if (node['@type']) entities.push(node);
  };
  nodes.forEach(walk);
  return entities;
}

function analyzeStructuredData(html) {
  const blocks = matchAll(html, /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const parsed = [];
  const parseErrors = [];
  for (const block of blocks) {
    const raw = block[1].trim();
    try {
      parsed.push(JSON.parse(raw));
    } catch (error) {
      const hints = [];
      if (/,\s*[}\]]/.test(raw)) hints.push('nachgestelltes Komma');
      if (/'[^']*'\s*:/.test(raw)) hints.push('einfache statt doppelte Anführungszeichen');
      parseErrors.push(`${error.message}${hints.length ? ` (mögliche Ursache: ${hints.join(', ')})` : ''}`);
    }
  }

  const entities = flattenJsonLd(parsed);
  const typeNames = (entity) => (Array.isArray(entity['@type']) ? entity['@type'] : [entity['@type']]).map(String);
  const missing = [];
  const stringAuthors = [];

  for (const entity of entities) {
    for (const type of typeNames(entity)) {
      const spec = SCHEMA_REQUIREMENTS[type];
      if (!spec) continue;
      const absent = (spec.required || []).filter((field) => entity[field] === undefined);
      if (absent.length > 0) missing.push({ type, fields: absent });
      if (spec.oneOf && !spec.oneOf.some((field) => entity[field] !== undefined)) {
        missing.push({ type, fields: [`eines von: ${spec.oneOf.join(', ')}`] });
      }
      if (typeof entity.author === 'string') stringAuthors.push(type);
    }
  }

  return {
    blockCount: blocks.length,
    parseErrors,
    types: [...new Set(entities.flatMap(typeNames))],
    entityCount: entities.length,
    withId: entities.filter((entity) => entity['@id']).length,
    missingRequired: missing,
    stringAuthors: [...new Set(stringAuthors)],
  };
}

function analyzeUrl(pageUrl) {
  const parsed = new URL(pageUrl);
  const segments = parsed.pathname.split('/').filter(Boolean);
  const slug = segments[segments.length - 1] || '';
  return {
    protocol: parsed.protocol,
    https: parsed.protocol === 'https:',
    depth: segments.length,
    hasUppercase: /[A-Z]/.test(parsed.pathname),
    hasUnderscore: parsed.pathname.includes('_'),
    hasSpaces: /%20|\s/.test(parsed.pathname),
    hasSpecialChars: /[^a-zA-Z0-9\-/._~%]/.test(parsed.pathname),
    trailingSlash: parsed.pathname !== '/' && parsed.pathname.endsWith('/'),
    hasParams: parsed.search.length > 0,
    stopWords: slug.split('-').filter((part) => STOP_WORDS_IN_URL.includes(part.toLowerCase())),
  };
}

/**
 * Erkennt, ob wesentliche Inhalte erst clientseitig entstehen. Der Scan sieht
 * dieselbe Antwort wie ein Crawler ohne JavaScript-Ausführung.
 */
function analyzeRendering(html, headings, title) {
  const bodyMatch = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  const bodyText = bodyMatch ? stripTags(bodyMatch[1]) : stripTags(html);
  const emptyShell = /<div\b[^>]*\bid=["'](root|app|__next|__nuxt)["'][^>]*>\s*<\/div>/i.test(html);
  const scriptCount = matchAll(html, /<script\b/gi).length;
  const jsOnlyNav = matchAll(html, /<a\b(?![^>]*\bhref=)[^>]*>/gi).length;

  return {
    bodyWords: bodyText.split(/\s+/).filter(Boolean).length,
    emptyShell,
    scriptCount,
    anchorsWithoutHref: jsOnlyNav,
    titleInRawHtml: Boolean(title),
    h1InRawHtml: headings.h1.length > 0,
    likelyClientRendered: emptyShell || bodyText.split(/\s+/).filter(Boolean).length < 50,
  };
}

// ---------------------------------------------------------------------------
// Befunde
// ---------------------------------------------------------------------------

function buildFindings(result) {
  const findings = [];
  const add = (severity, area, page, text, fix) => findings.push({ severity, area, page, text, fix });

  const site = result.site;

  // ---- robots.txt
  if (!site.robotsTxt.present) {
    add('warnung', 'Crawling', '/robots.txt', 'Keine robots.txt im Wurzelverzeichnis erreichbar.',
      'robots.txt anlegen, mindestens mit "User-agent: *", "Allow: /" und einem Sitemap-Verweis.');
  } else {
    if (site.robotsTxt.bytes > LIMITS.robotsTxtBytesMax) {
      add('fehler', 'Crawling', '/robots.txt',
        `robots.txt ist ${Math.round(site.robotsTxt.bytes / 1024)} KB groß; Google ignoriert alles über ${LIMITS.robotsTxtBytesMax / 1024} KB.`,
        'Datei kürzen: Regeln zusammenfassen, Wildcards statt Einzelpfade.');
    }
    for (const issue of site.robotsTxt.issues) {
      add('warnung', 'Crawling', '/robots.txt', `Syntaxproblem: ${issue}`, 'Zeile korrigieren oder entfernen.');
    }
    if (site.robotsTxt.sitemaps.length === 0) {
      add('warnung', 'Crawling', '/robots.txt', 'Kein Sitemap-Verweis in der robots.txt.',
        'Zeile "Sitemap: https://…/sitemap.xml" ergänzen.');
    }
  }

  // ---- Sitemap
  if (!site.sitemap.present) {
    add('fehler', 'Indexierung', '/sitemap.xml', 'Keine XML-Sitemap erreichbar.',
      'Sitemap generieren, in robots.txt verlinken und in der Search Console einreichen.');
  } else {
    if (site.sitemap.urlCount > LIMITS.sitemapUrlsMax) {
      add('fehler', 'Indexierung', '/sitemap.xml',
        `Sitemap enthält ${site.sitemap.urlCount} URLs; das Maximum ist ${LIMITS.sitemapUrlsMax}.`,
        'Auf mehrere Sitemaps aufteilen und eine Sitemap-Index-Datei anlegen.');
    }
    if (site.sitemap.bytes > LIMITS.sitemapBytesMax) {
      add('fehler', 'Indexierung', '/sitemap.xml', 'Sitemap überschreitet 50 MB unkomprimiert.', 'Aufteilen.');
    }
    if (site.sitemap.relativeUrls > 0) {
      add('fehler', 'Indexierung', '/sitemap.xml',
        `${site.sitemap.relativeUrls} Einträge sind keine absoluten URLs.`,
        '<loc> muss die vollständige URL inklusive Protokoll enthalten.');
    }
    if (site.sitemap.withoutLastmod === site.sitemap.urlCount && site.sitemap.urlCount > 0) {
      add('warnung', 'Indexierung', '/sitemap.xml', 'Kein Eintrag hat ein <lastmod>.',
        '<lastmod> im Format YYYY-MM-DD ergänzen — Google steuert damit die Neu-Crawl-Frequenz.');
    }
    if (site.sitemap.badLastmod > 0) {
      add('warnung', 'Indexierung', '/sitemap.xml',
        `${site.sitemap.badLastmod} Einträge haben ein <lastmod> in unzulässigem Format.`,
        'W3C-Datetime verwenden, mindestens YYYY-MM-DD.');
    }
    for (const bad of site.sitemap.badEntries) {
      add('fehler', 'Indexierung', bad.url,
        `In der Sitemap, liefert aber Status ${bad.status}.`,
        'Nur indexierbare 200-URLs in die Sitemap aufnehmen.');
    }
    for (const blocked of site.sitemap.blockedEntries) {
      add('fehler', 'Indexierung', blocked,
        'Steht in der Sitemap, ist aber per robots.txt gesperrt.',
        'Widerspruch auflösen: entweder aus der Sitemap entfernen oder Crawling erlauben.');
    }
  }

  // ---- Seiten
  const titles = new Map();
  const descriptions = new Map();

  for (const page of result.pages) {
    const label = page.ok ? new URL(page.url).pathname : page.url;

    if (!page.ok) {
      add('fehler', 'Erreichbarkeit', label, `Seite nicht abrufbar (${page.error || `Status ${page.status}`}).`,
        'Erreichbarkeit prüfen.');
      continue;
    }

    if (page.chain.length > LIMITS.maxRedirectHops + 1) {
      add('warnung', 'Status', label,
        `Redirect-Kette über ${page.chain.length - 1} Sprünge: ${page.chain.map((h) => h.status).join(' → ')}.`,
        'Direkt auf das Ziel umleiten, ein Sprung genügt.');
    }

    // Indexierbarkeit zuerst — alles andere ist ohne sie wirkungslos.
    if (page.robotsMeta.noindex) {
      add('fehler', 'Indexierung', label, 'Seite ist auf noindex gesetzt.',
        'Beabsichtigt? Dann in Ordnung. Falls nicht: Direktive entfernen. Prüfe auch den X-Robots-Tag-Header, er hat Vorrang.');
    }
    if (page.robotsMeta.conflicting) {
      add('fehler', 'Indexierung', label, 'Widersprüchliche Robots-Direktiven (index und noindex gleichzeitig).',
        'Auf eine Direktive reduzieren. Google folgt im Zweifel der restriktivsten.');
    }
    if (page.robotsMeta.unknown.length > 0) {
      add('warnung', 'Indexierung', label, `Unbekannte Robots-Direktiven: ${page.robotsMeta.unknown.join(', ')}.`,
        'Tippfehler korrigieren; unbekannte Direktiven werden ignoriert.');
    }
    if (page.robotsMeta.noindex && page.blockedByRobotsTxt) {
      add('fehler', 'Indexierung', label,
        'Fatale Kombination: noindex gesetzt UND per robots.txt gesperrt. Der Crawler liest die Direktive nie, die Seite kann dauerhaft als URL-only-Treffer im Index bleiben.',
        'Sperre in robots.txt entfernen, damit noindex gelesen werden kann.');
    }
    if (page.blockedByRobotsTxt && !page.robotsMeta.noindex) {
      add('warnung', 'Crawling', label, `Per robots.txt gesperrt (${page.robotsRule}).`,
        'Beabsichtigt? Sonst Regel anpassen.');
    }

    // ---- Rendering
    if (page.rendering.likelyClientRendered) {
      add('fehler', 'Rendering', label,
        `Die Server-Antwort enthält kaum Text (${page.rendering.bodyWords} Wörter)${page.rendering.emptyShell ? ' und einen leeren Mount-Container' : ''}. Inhalte entstehen offenbar erst per JavaScript.`,
        'Kritische Inhalte serverseitig ausliefern (SSR oder SSG). Andere Crawler als Googlebot führen praktisch kein JavaScript aus.');
    }
    if (!page.rendering.titleInRawHtml) {
      add('fehler', 'Rendering', label, 'Kein <title> in der Server-Antwort.',
        'Title serverseitig setzen, nicht per JavaScript nachtragen.');
    }
    if (page.rendering.anchorsWithoutHref > 3) {
      add('warnung', 'Rendering', label,
        `${page.rendering.anchorsWithoutHref} <a>-Elemente ohne href-Attribut.`,
        'Navigation über echte <a href>-Links, nicht über Klick-Handler — sonst findet der Crawler die Ziele nicht.');
    }

    // ---- Title
    if (page.title.count === 0) {
      add('fehler', 'Title', label, 'Kein Title-Tag.', 'Title ergänzen, 50–60 Zeichen, Hauptbegriff vorne.');
    } else {
      if (page.title.count > 1) {
        add('fehler', 'Title', label, `${page.title.count} Title-Tags.`, 'Auf einen reduzieren.');
      }
      if (page.title.generic) {
        add('fehler', 'Title', label, `Generischer Title ("${page.title.text}").`,
          'Konkreten, seitenspezifischen Title formulieren.');
      }
      if (page.title.pixelWidth > LIMITS.titlePixelBudget) {
        add('warnung', 'Title', label,
          `Title ist ca. ${page.title.pixelWidth} px breit (${page.title.length} Zeichen) und wird bei ~${LIMITS.titlePixelBudget} px gekürzt.`,
          'Kürzen, Hauptaussage nach vorne. Google kürzt nach Pixelbreite, nicht nach Zeichenzahl.');
      } else if (page.title.length < LIMITS.titleMin) {
        add('warnung', 'Title', label, `Title ist mit ${page.title.length} Zeichen sehr kurz.`,
          `Auf ${LIMITS.titleIdealMin}–${LIMITS.titleIdealMax} Zeichen ausbauen.`);
      }
      const key = page.title.text.trim().toLowerCase();
      if (key) titles.set(key, [...(titles.get(key) || []), label]);
    }

    // ---- Meta Description
    if (page.description.count === 0) {
      add('warnung', 'Description', label, 'Keine Meta-Description.',
        `Description mit ${LIMITS.descIdealMin}–${LIMITS.descIdealMax} Zeichen ergänzen.`);
    } else {
      if (page.description.count > 1) {
        add('fehler', 'Description', label, `${page.description.count} Description-Tags.`, 'Auf eines reduzieren.');
      }
      if (page.description.length > LIMITS.descIdealMax) {
        add('warnung', 'Description', label,
          `Description ist ${page.description.length} Zeichen lang und wird auf dem Desktop wahrscheinlich gekürzt.`,
          `Auf ${LIMITS.descIdealMin}–${LIMITS.descIdealMax} Zeichen kürzen; die ersten ~120 Zeichen sind auch mobil sichtbar.`);
      } else if (page.description.length < LIMITS.descMin) {
        add('hinweis', 'Description', label,
          `Description nutzt mit ${page.description.length} Zeichen den verfügbaren Platz nicht aus.`,
          `Auf ${LIMITS.descIdealMin}–${LIMITS.descIdealMax} Zeichen ausbauen.`);
      }
      const key = page.description.text.trim().toLowerCase();
      if (key) descriptions.set(key, [...(descriptions.get(key) || []), label]);
    }

    // ---- Canonical
    if (page.canonical.count === 0) {
      add('warnung', 'Canonical', label, 'Kein Canonical-Tag.',
        'Selbstreferenzierendes Canonical mit absoluter URL setzen.');
    } else {
      if (page.canonical.count > 1 && new Set(page.canonical.hrefs).size > 1) {
        add('fehler', 'Canonical', label,
          `${page.canonical.count} Canonicals mit unterschiedlichen Zielen — beide werden ignoriert.`,
          'Auf ein Canonical reduzieren.');
      }
      if (!page.canonical.absolute) {
        add('fehler', 'Canonical', label, `Canonical ist keine absolute URL ("${page.canonical.href}").`,
          'Vollständige URL inklusive Protokoll und Host verwenden.');
      }
      if (page.canonical.hasUppercase) {
        add('warnung', 'Canonical', label, 'Canonical-URL enthält Großbuchstaben.',
          'Kleinschreibung verwenden — Suchmaschinen behandeln unterschiedliche Schreibweisen als verschiedene URLs.');
      }
      if (page.robotsMeta.noindex) {
        add('warnung', 'Canonical', label, 'Canonical und noindex zusammen auf einer Seite.',
          'Widersprüchliche Signale. Entweder konsolidieren (Canonical) oder ausschließen (noindex), nicht beides.');
      }
      if (page.canonicalTarget && page.canonicalTarget.status !== 200) {
        add('fehler', 'Canonical', label,
          `Canonical zeigt auf eine URL mit Status ${page.canonicalTarget.status}.`,
          'Canonical muss auf eine URL zeigen, die 200 zurückgibt.');
      }
      if (page.canonicalTarget && page.canonicalTarget.redirects) {
        add('fehler', 'Canonical', label, 'Canonical zeigt auf eine URL, die weiterleitet.',
          'Direkt auf das Endziel zeigen.');
      }
    }

    // ---- Headings
    if (page.headings.h1.length === 0) {
      add('fehler', 'Struktur', label, 'Keine H1.', 'Genau eine H1 setzen, die das Hauptthema benennt.');
    } else if (page.headings.h1.length > 1) {
      add('warnung', 'Struktur', label, `${page.headings.h1.length} H1-Überschriften.`,
        'Auf eine reduzieren; die weiteren zu H2 machen.');
    }
    if (page.headings.skips.length > 0) {
      add('warnung', 'Struktur', label, `Übersprungene Überschriftenebenen: ${page.headings.skips.join('; ')}.`,
        'Hierarchie ohne Sprünge nach unten aufbauen. Ebenen dienen der Struktur, nicht der Schriftgröße.');
    }
    if (page.headings.empty.length > 0) {
      add('warnung', 'Struktur', label, `Leere Überschriften-Tags: ${page.headings.empty.join(', ')}.`,
        'Entfernen oder mit Text füllen.');
    }
    if (page.headings.duplicates.length > 0) {
      add('hinweis', 'Struktur', label,
        `Mehrfach identische Überschriften: ${page.headings.duplicates.slice(0, 3).join(', ')}.`,
        'Überschriften eindeutig formulieren.');
    }

    // ---- URL
    if (!page.urlInfo.https) {
      add('fehler', 'URL', label, 'Seite wird nicht über HTTPS ausgeliefert.', 'HTTPS einrichten und per 301 erzwingen.');
    }
    if (page.urlInfo.hasUppercase) {
      add('warnung', 'URL', label, 'URL enthält Großbuchstaben.', 'Kleinschreibung und 301 von der alten Variante.');
    }
    if (page.urlInfo.hasUnderscore) {
      add('hinweis', 'URL', label, 'URL nutzt Unterstriche als Worttrenner.', 'Bindestriche verwenden.');
    }
    if (page.urlInfo.hasSpaces || page.urlInfo.hasSpecialChars) {
      add('warnung', 'URL', label, 'URL enthält Leerzeichen oder Sonderzeichen.', 'Auf a–z, 0–9 und Bindestriche beschränken.');
    }
    if (page.urlInfo.depth > LIMITS.urlDepthMax) {
      add('hinweis', 'URL', label, `Pfadtiefe ${page.urlInfo.depth}.`,
        `Wichtige Seiten innerhalb von ${LIMITS.urlDepthMax} Ebenen erreichbar halten.`);
    }
    if (page.urlInfo.stopWords.length > 0) {
      add('hinweis', 'URL', label, `Füllwörter im Slug: ${page.urlInfo.stopWords.join(', ')}.`, 'Slug kürzen.');
    }

    // ---- Bilder
    const missingAlt = page.images.filter((image) => !image.altPresent);
    const longAlt = page.images.filter((image) => image.altLength > LIMITS.altMax);
    const noDimensions = page.images.filter((image) => !image.hasWidth || !image.hasHeight);
    const badNames = page.images.filter((image) => image.badFilename);
    const lazyFirst = page.images.slice(0, 1).filter((image) => image.lazy);
    const legacyFormat = page.images.filter((image) => ['jpg', 'jpeg', 'png'].includes(image.format));

    if (missingAlt.length > 0) {
      add('fehler', 'Bilder', label, `${missingAlt.length} von ${page.images.length} Bildern ohne alt-Attribut.`,
        'Beschreibendes alt setzen; bei rein dekorativen Bildern alt="" (leer, aber vorhanden).');
    }
    if (longAlt.length > 0) {
      add('hinweis', 'Bilder', label, `${longAlt.length} alt-Texte über ${LIMITS.altMax} Zeichen.`, 'Kürzen.');
    }
    if (noDimensions.length > 0) {
      add('warnung', 'Bilder', label,
        `${noDimensions.length} Bilder ohne width/height. Das ist eine häufige Ursache für Layout-Verschiebungen (CLS).`,
        'Explizite width- und height-Attribute setzen, damit der Platz vor dem Laden reserviert wird.');
    }
    if (lazyFirst.length > 0) {
      add('warnung', 'Bilder', label, 'Das erste Bild der Seite hat loading="lazy".',
        'Bilder oberhalb der Falz nicht lazy laden — das verschlechtert den LCP.');
    }
    if (badNames.length > 0) {
      add('hinweis', 'Bilder', label, `${badNames.length} Dateinamen sind nicht sprechend (z. B. Großbuchstaben, Unterstriche, IMG_1234).`,
        'Beschreibende Namen in Kleinschreibung mit Bindestrichen.');
    }
    if (legacyFormat.length > 0 && page.images.length > 0) {
      add('hinweis', 'Bilder', label, `${legacyFormat.length} Bilder im Format JPEG/PNG.`,
        'WebP (25–35 % kleiner) oder AVIF (~50 % kleiner) mit Fallback ausliefern.');
    }
    for (const heavy of page.heavyImages) {
      add('warnung', 'Bilder', label, `Bild über ${LIMITS.imageBytesMax / 1024} KB: ${heavy.src} (${Math.round(heavy.bytes / 1024)} KB).`,
        'Komprimieren und auf die maximale Darstellungsbreite verkleinern.');
    }

    // ---- Links
    const genericAnchors = page.links.filter((link) => link.anchorGeneric);
    const emptyAnchors = page.links.filter((link) => link.anchorEmpty);
    const unsafeBlank = page.links.filter((link) => link.targetBlank && !link.rel.includes('noopener'));

    if (genericAnchors.length > 0) {
      add('warnung', 'Links', label,
        `${genericAnchors.length} Links mit generischem Ankertext (${[...new Set(genericAnchors.map((l) => l.anchor))].slice(0, 3).join(', ')}).`,
        'Ankertext soll das Ziel beschreiben — hilft Suchmaschinen und Screenreadern.');
    }
    if (emptyAnchors.length > 0) {
      add('warnung', 'Links', label, `${emptyAnchors.length} Links ohne Ankertext.`,
        'Text ergänzen oder bei Icon-Links ein aria-label setzen.');
    }
    if (unsafeBlank.length > 0) {
      add('hinweis', 'Links', label, `${unsafeBlank.length} Links mit target="_blank" ohne rel="noopener".`,
        'rel="noopener noreferrer" ergänzen.');
    }
    for (const broken of page.brokenLinks) {
      add(broken.status >= 400 ? 'fehler' : 'warnung', 'Links', label,
        `Link liefert Status ${broken.status}: ${broken.href}`,
        broken.status >= 400 ? 'Ziel korrigieren oder Link entfernen.' : 'Direkt auf das Endziel verlinken statt auf eine Weiterleitung.');
    }

    // ---- hreflang
    for (const entry of page.hreflang) {
      if (entry.errors.length > 0) {
        add('fehler', 'International', label, `hreflang="${entry.code}": ${entry.errors.join('; ')}.`,
          'Format ist Sprache (ISO 639-1) optional plus Bindestrich und Region (ISO 3166-1), beides klein.');
      }
    }
    if (page.hreflang.length > 0) {
      if (!page.hreflangSelfReference) {
        add('fehler', 'International', label, 'hreflang-Gruppe ohne Selbstreferenz auf diese Seite.',
          'Jede Seite muss sich selbst mit ihrem eigenen Sprachcode aufführen.');
      }
      if (!page.hreflang.some((entry) => entry.isDefault)) {
        add('hinweis', 'International', label, 'Kein hreflang="x-default".',
          'Fallback für nicht abgedeckte Sprachen und Regionen ergänzen.');
      }
      for (const missing of page.hreflangMissingReturn) {
        add('fehler', 'International', label,
          `Keine Rückverlinkung von ${missing}. Fehlende Reziprozität führt dazu, dass Google die gesamte hreflang-Gruppe ignoriert.`,
          'Auf der Gegenseite den hreflang-Verweis zurück auf diese Seite setzen.');
      }
    }
    if (!page.lang) {
      add('warnung', 'International', label, 'Kein lang-Attribut am <html>-Element.', 'lang setzen.');
    }

    // ---- Social
    const requiredOg = ['og:title', 'og:type', 'og:image', 'og:url'];
    const missingOg = requiredOg.filter((key) => !page.social.og[key]);
    if (missingOg.length === requiredOg.length) {
      add('warnung', 'Social', label, 'Keine Open-Graph-Tags.',
        'Mindestens og:title, og:type, og:image und og:url setzen, sonst bestimmen Plattformen die Vorschau selbst.');
    } else if (missingOg.length > 0) {
      add('warnung', 'Social', label, `Fehlende Open-Graph-Pflichtfelder: ${missingOg.join(', ')}.`, 'Ergänzen.');
    }
    for (const problem of page.social.wrongAttribute) {
      add('fehler', 'Social', label, `Falsches Attribut: ${problem}.`,
        'Open Graph nutzt property=, Twitter-Tags nutzen name=.');
    }
    if (page.social.og['og:image'] && !/^https:\/\//i.test(page.social.og['og:image'])) {
      add('fehler', 'Social', label, 'og:image ist keine absolute HTTPS-URL.', 'Vollständige HTTPS-URL verwenden; relative Pfade werden abgelehnt.');
    }
    if (page.ogImage && page.ogImage.status !== 200) {
      add('fehler', 'Social', label, `og:image liefert Status ${page.ogImage.status}.`, 'Erreichbares Bild verlinken.');
    }
    if (page.ogImage && page.ogImage.bytes && page.ogImage.bytes > LIMITS.ogImageBytesMax) {
      add('warnung', 'Social', label, 'og:image ist größer als 5 MB.', 'Komprimieren; empfohlen sind 1200 × 630 px.');
    }
    if (Object.keys(page.social.og).length > 0 && !page.social.og['og:image:alt']) {
      add('hinweis', 'Social', label, 'og:image:alt fehlt.', 'Alternativtext für die Vorschaugrafik ergänzen.');
    }
    if (Object.keys(page.social.twitter).length > 0 && !page.social.twitter['twitter:card']) {
      add('warnung', 'Social', label, 'twitter-Tags vorhanden, aber twitter:card fehlt.',
        'twitter:card setzen (summary oder summary_large_image).');
    }

    // ---- Structured Data
    for (const error of page.structuredData.parseErrors) {
      add('fehler', 'Structured Data', label, `JSON-LD nicht parsebar: ${error}`,
        'Syntax korrigieren — ein Fehler entwertet den gesamten Block.');
    }
    for (const missing of page.structuredData.missingRequired) {
      add('warnung', 'Structured Data', label,
        `${missing.type}: fehlende Pflichtfelder für Rich Results (${missing.fields.join(', ')}).`,
        'Felder ergänzen oder den Typ entfernen, wenn er nicht zutrifft.');
    }
    for (const type of page.structuredData.stringAuthors) {
      add('hinweis', 'Structured Data', label, `${type}.author ist eine Zeichenkette.`,
        'Als verschachteltes Person- oder Organization-Objekt auszeichnen.');
    }

    // ---- Inhalt
    // Nur auf Seiten mit echtem Fließtext. Auf Navigations-, Rechts- und
    // Übersichtsseiten misst die Satzsegmentierung Fragmente, und der Befund
    // wäre in jedem Fall ohne Handlungsoption.
    if (page.readability.flesch !== null && page.readability.words >= 300) {
      if (page.readability.wordsPerSentence > LIMITS.sentenceWordsIdealMax + 10) {
        add('hinweis', 'Inhalt', label,
          `Durchschnittlich ${page.readability.wordsPerSentence} Wörter pro Satz.`,
          `Zielbereich sind ${LIMITS.sentenceWordsIdealMin}–${LIMITS.sentenceWordsIdealMax} Wörter. Lange Sätze teilen.`);
      }
      // Der Zielbereich 60–70 ist an englischem Text kalibriert. Deutsche
      // Komposita drücken den Wert systematisch; deutsche Fachtexte liegen
      // regelmäßig bei 30–50, ohne dass daran etwas zu verbessern wäre.
      const german = /Amstad/.test(page.readability.formula || '');
      const floor = german ? 20 : 30;
      if (page.readability.flesch < floor) {
        add('hinweis', 'Inhalt', label,
          `Lesbarkeit ${page.readability.flesch} (${page.readability.formula}) liegt auch für Fachtext niedrig.`,
          german
            ? 'Prüfe die längsten Sätze und die häufigsten Komposita. Der oft genannte Zielbereich 60–70 gilt für englischen Text und ist für deutsche Fachinhalte kein realistisches Ziel — bewerte relativ zu vergleichbaren Seiten, nicht absolut.'
            : `Zielbereich für allgemeine Webinhalte ist ${LIMITS.fleschIdealMin}–${LIMITS.fleschIdealMax}. Kürzere Sätze, einfachere Wörter.`);
      }
    }
  }

  // ---- Duplikate über Seiten hinweg
  for (const [text, pages] of titles) {
    if (pages.length > 1) {
      add('fehler', 'Title', pages.join(', '), `Identischer Title auf ${pages.length} Seiten: "${text.slice(0, 60)}".`,
        'Titles müssen pro indexierbarer URL eindeutig sein.');
    }
  }
  for (const [, pages] of descriptions) {
    if (pages.length > 1) {
      add('warnung', 'Description', pages.join(', '), `Identische Meta-Description auf ${pages.length} Seiten.`,
        'Pro Seite eine eigene Description; Google ignoriert Duplikate.');
    }
  }

  const order = { fehler: 0, warnung: 1, hinweis: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity] || a.area.localeCompare(b.area));
  return findings;
}

// ---------------------------------------------------------------------------
// Sitemap
// ---------------------------------------------------------------------------

async function analyzeSitemap(origin, robotsGroups, sampleSize) {
  const candidates = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap-index.xml'];
  let response = null;
  for (const candidate of candidates) {
    const attempt = await request(`${origin}${candidate}`, 'GET');
    if (attempt.ok && /<(urlset|sitemapindex)/i.test(attempt.body)) {
      response = attempt;
      break;
    }
  }
  if (!response) return { present: false };

  let body = response.body;
  let bytes = Buffer.byteLength(body, 'utf8');

  // Bei einem Sitemap-Index die erste enthaltene Sitemap auswerten.
  if (/<sitemapindex/i.test(body)) {
    const first = (/<loc>\s*([^<\s]+)\s*<\/loc>/i.exec(body) || [])[1];
    if (first) {
      const inner = await request(first, 'GET');
      if (inner.ok) {
        body = inner.body;
        bytes = Buffer.byteLength(body, 'utf8');
      }
    }
  }

  const entries = matchAll(body, /<url>([\s\S]*?)<\/url>/gi).map((match) => {
    const block = match[1];
    return {
      loc: (/<loc>\s*([^<\s]+)\s*<\/loc>/i.exec(block) || [])[1] || '',
      lastmod: (/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/i.exec(block) || [])[1] || null,
    };
  });

  const badEntries = [];
  const blockedEntries = [];
  for (const entry of entries.slice(0, sampleSize)) {
    if (!entry.loc) continue;
    let pathname;
    try {
      pathname = new URL(entry.loc).pathname;
    } catch {
      continue;
    }
    const verdict = isAllowed(robotsGroups, pathname);
    if (!verdict.allowed) blockedEntries.push(entry.loc);
    const head = await request(entry.loc, 'HEAD');
    if (head.status !== 200) badEntries.push({ url: entry.loc, status: head.status });
    await sleep(POLITENESS_DELAY_MS);
  }

  return {
    present: true,
    url: response.url,
    bytes,
    urlCount: entries.length,
    relativeUrls: entries.filter((entry) => entry.loc && !/^https?:\/\//i.test(entry.loc)).length,
    withoutLastmod: entries.filter((entry) => !entry.lastmod).length,
    badLastmod: entries.filter((entry) => entry.lastmod && !/^\d{4}-\d{2}-\d{2}/.test(entry.lastmod)).length,
    sampled: Math.min(entries.length, sampleSize),
    badEntries,
    blockedEntries,
  };
}

// ---------------------------------------------------------------------------
// Ablauf
// ---------------------------------------------------------------------------

async function analyzePage(url, robotsGroups, options) {
  const response = await requestFollowing(url);
  if (!response.ok) {
    return { url, ok: false, status: response.status, error: response.error, chain: response.chain || [] };
  }

  const html = response.body;
  const head = headSection(html);
  const pageUrl = response.finalUrl;

  const title = analyzeTitles(head);
  const description = analyzeDescription(head);
  const canonical = analyzeCanonical(head, response.linkHeader);
  const robotsMeta = analyzeRobotsMeta(head, response.xRobotsTag);
  const headings = analyzeHeadings(html);
  const images = analyzeImages(mainContent(html));
  const links = analyzeLinks(html, pageUrl);
  const hreflang = analyzeHreflang(head);
  const social = analyzeSocial(head);
  const structuredData = analyzeStructuredData(html);
  const urlInfo = analyzeUrl(pageUrl);
  const rendering = analyzeRendering(html, headings, title.text);
  const langMatch = /<html\b[^>]*\blang=["']([^"']+)["']/i.exec(html);
  const lang = langMatch ? langMatch[1] : null;
  // stripTags ist zwingend: auf rohem HTML zählt die Satzsegmentierung Tags als
  // Wörter und liefert massiv überhöhte Satzlängen.
  const readabilityStats = readability(stripTags(mainContent(html)), lang);

  const robotsVerdict = isAllowed(robotsGroups, new URL(pageUrl).pathname);

  // Canonical-Ziel prüfen
  let canonicalTarget = null;
  if (canonical.href && canonical.absolute && canonical.href !== pageUrl) {
    const target = await request(canonical.href, 'GET');
    canonicalTarget = {
      status: target.status,
      redirects: target.status >= 300 && target.status < 400,
    };
    await sleep(POLITENESS_DELAY_MS);
  }

  // hreflang-Reziprozität an einer Stichprobe
  const hreflangSelfReference = hreflang.some((entry) => {
    try {
      return new URL(entry.href).href.replace(/\/$/, '') === pageUrl.replace(/\/$/, '');
    } catch {
      return false;
    }
  });
  const hreflangMissingReturn = [];
  if (options.checkHreflangReturn) {
    for (const entry of hreflang.filter((e) => !e.isDefault && e.errors.length === 0).slice(0, 3)) {
      if (entry.href.replace(/\/$/, '') === pageUrl.replace(/\/$/, '')) continue;
      const other = await request(entry.href, 'GET');
      if (!other.ok) continue;
      const back = analyzeHreflang(headSection(other.body));
      const found = back.some((candidate) => {
        try {
          return new URL(candidate.href).href.replace(/\/$/, '') === pageUrl.replace(/\/$/, '');
        } catch {
          return false;
        }
      });
      if (!found) hreflangMissingReturn.push(entry.href);
      await sleep(POLITENESS_DELAY_MS);
    }
  }

  // Interne Links stichprobenartig prüfen
  const brokenLinks = [];
  const uniqueTargets = [...new Set(links.filter((link) => link.internal).map((link) => link.href))]
    .filter((href) => href !== pageUrl)
    .slice(0, options.linkSample);
  for (const href of uniqueTargets) {
    const head_ = await request(href, 'HEAD');
    if (head_.status >= 300 && head_.status !== 304) brokenLinks.push({ href, status: head_.status });
    await sleep(POLITENESS_DELAY_MS / 2);
  }

  // Bildgrößen stichprobenartig
  const heavyImages = [];
  for (const image of images.filter((i) => i.src).slice(0, options.imageSample)) {
    let absolute;
    try {
      absolute = new URL(image.src, pageUrl).href;
    } catch {
      continue;
    }
    const head_ = await request(absolute, 'HEAD');
    if (head_.contentLength && head_.contentLength > LIMITS.imageBytesMax) {
      heavyImages.push({ src: image.src, bytes: head_.contentLength });
    }
    await sleep(POLITENESS_DELAY_MS / 2);
  }

  // og:image prüfen
  let ogImage = null;
  if (social.og['og:image']) {
    try {
      const absolute = new URL(social.og['og:image'], pageUrl).href;
      const head_ = await request(absolute, 'HEAD');
      ogImage = { status: head_.status, bytes: head_.contentLength };
    } catch {
      ogImage = { status: 0, bytes: null };
    }
  }

  return {
    url: pageUrl,
    ok: true,
    status: response.status,
    chain: response.chain,
    lang,
    title,
    description,
    canonical,
    canonicalTarget,
    robotsMeta,
    blockedByRobotsTxt: !robotsVerdict.allowed,
    robotsRule: robotsVerdict.rule,
    headings,
    images,
    heavyImages,
    links: links.map(({ href, internal, anchor, anchorGeneric, anchorEmpty, rel, targetBlank }) =>
      ({ href, internal, anchor, anchorGeneric, anchorEmpty, rel, targetBlank })),
    linkStats: {
      total: links.length,
      internal: links.filter((link) => link.internal).length,
      external: links.filter((link) => !link.internal).length,
      nofollow: links.filter((link) => link.rel.includes('nofollow')).length,
      withParams: links.filter((link) => link.hasParams).length,
    },
    brokenLinks,
    hreflang,
    hreflangSelfReference,
    hreflangMissingReturn,
    social,
    ogImage,
    structuredData,
    urlInfo,
    rendering,
    readability: readabilityStats,
  };
}

async function run(opts) {
  const first = opts.site || opts.targets[0];
  const normalized = /^https?:\/\//i.test(first) ? first : `https://${first}`;
  const origin = new URL(normalized).origin;

  const robotsResponse = await request(`${origin}/robots.txt`, 'GET');
  const robotsIsText = robotsResponse.ok && !/<html/i.test(robotsResponse.body);
  const robots = robotsIsText ? parseRobots(robotsResponse.body) : { groups: [], sitemaps: [], issues: [] };

  const sitemap = await analyzeSitemap(origin, robots.groups, opts.sitemapSample);

  let pageUrls = opts.targets.filter((target) => /^https?:\/\//i.test(target));
  if (pageUrls.length === 0) {
    const fromSitemap = sitemap.present
      ? matchAll(
        (await request(sitemap.url, 'GET')).body,
        /<loc>\s*([^<\s]+)\s*<\/loc>/gi,
      ).map((match) => match[1]).filter((url) => !/\.xml$/i.test(url))
      : [];
    pageUrls = fromSitemap.length > 0 ? fromSitemap : [normalized];
  }
  pageUrls = pageUrls.slice(0, opts.maxPages);

  const options = {
    linkSample: opts.linkSample,
    imageSample: opts.imageSample,
    checkHreflangReturn: opts.checkHreflangReturn,
  };

  const pages = [];
  for (const url of pageUrls) {
    pages.push(await analyzePage(url, robots.groups, options));
    await sleep(POLITENESS_DELAY_MS);
  }

  const result = {
    meta: {
      origin,
      generatedAt: new Date().toISOString(),
      pagesChecked: pages.length,
      userAgent: USER_AGENT,
      limits: LIMITS,
      notMeasured: [
        'Core Web Vitals (LCP, INP, CLS): brauchen echte Messung im Browser oder Felddaten aus der Search Console. Der Scan meldet nur bekannte Auslöser wie fehlende Bildabmessungen.',
        'Übereinstimmung mit der Suchintention: nicht maschinell entscheidbar.',
        'Inhaltliche Tiefe und Vollständigkeit: nicht maschinell entscheidbar.',
        'Duplicate Content über Domains hinweg: benötigt einen externen Index.',
        'llms.txt und KI-Crawler: bewusst nicht Teil dieses Scans, siehe Skill "geo-audit".',
      ],
      caveats: [
        'Nur HTML aus der Server-Antwort ohne JavaScript-Ausführung — dieselbe Sicht wie die meisten Crawler.',
        'Pixelbreiten für Title sind geschätzt, keine echte Textmessung.',
        'Lesbarkeitswerte nutzen bei deutschsprachigen Seiten die Amstad-Variante der Flesch-Formel.',
        'Links, Bilder und hreflang-Rückverweise werden stichprobenartig geprüft, nicht vollständig.',
      ],
    },
    site: {
      robotsTxt: {
        present: robotsIsText,
        status: robotsResponse.status,
        bytes: robotsIsText ? Buffer.byteLength(robotsResponse.body, 'utf8') : 0,
        sitemaps: robots.sitemaps,
        issues: robots.issues,
        groupCount: robots.groups.length,
      },
      sitemap,
    },
    pages,
  };
  result.findings = buildFindings(result);
  return result;
}

// ---------------------------------------------------------------------------
// Ausgabe
// ---------------------------------------------------------------------------

function renderText(result) {
  const lines = [];
  lines.push('SEO-CHECK');
  lines.push(`Origin: ${result.meta.origin}`);
  lines.push(`Geprüfte Seiten: ${result.meta.pagesChecked}`);
  lines.push('');

  lines.push('SITE-EBENE');
  const robotsTxt = result.site.robotsTxt;
  lines.push(`  robots.txt:  ${robotsTxt.present
    ? `vorhanden (${robotsTxt.groupCount} Gruppen, ${robotsTxt.sitemaps.length} Sitemap-Verweise, ${robotsTxt.issues.length} Syntaxprobleme)`
    : 'nicht vorhanden'}`);
  const sitemap = result.site.sitemap;
  lines.push(`  sitemap.xml: ${sitemap.present
    ? `${sitemap.url} — ${sitemap.urlCount} URLs, ${sitemap.withoutLastmod} ohne lastmod, ${sitemap.sampled} stichprobenartig geprüft`
    : 'nicht vorhanden'}`);
  lines.push('');

  lines.push('SEITEN');
  for (const page of result.pages) {
    if (!page.ok) {
      lines.push(`  ${page.url} — FEHLER: ${page.error || `Status ${page.status}`}`);
      continue;
    }
    const path = new URL(page.url).pathname;
    lines.push(`  ${path}`);
    lines.push(`      Title:       ${page.title.text ? `"${page.title.text}"` : 'fehlt'}`);
    lines.push(`                   ${page.title.length} Zeichen, ca. ${page.title.pixelWidth} px`);
    lines.push(`      Description: ${page.description.length} Zeichen${page.description.count !== 1 ? ` (${page.description.count} Tags)` : ''}`);
    lines.push(`      Canonical:   ${page.canonical.href || 'fehlt'}`);
    lines.push(`      Robots:      ${[...page.robotsMeta.directives, ...page.robotsMeta.headerDirectives].join(', ') || 'keine Direktiven'}`);
    lines.push(`      Struktur:    H1 ${page.headings.counts.h1}, H2 ${page.headings.counts.h2}, H3 ${page.headings.counts.h3}`
      + `${page.headings.skips.length ? `, ${page.headings.skips.length} Ebenensprünge` : ''}`);
    lines.push(`      Bilder:      ${page.images.length} (${page.images.filter((i) => !i.altPresent).length} ohne alt, `
      + `${page.images.filter((i) => !i.hasWidth || !i.hasHeight).length} ohne Abmessungen)`);
    lines.push(`      Links:       ${page.linkStats.total} (${page.linkStats.internal} intern, ${page.linkStats.external} extern, `
      + `${page.brokenLinks.length} auffällig)`);
    lines.push(`      JSON-LD:     ${page.structuredData.blockCount} Block/Blöcke, Typen: ${page.structuredData.types.join(', ') || 'keine'}`);
    lines.push(`      Rendering:   ${page.rendering.bodyWords} Wörter im Server-HTML`
      + `${page.rendering.likelyClientRendered ? ' — vermutlich clientseitig gerendert' : ''}`);
    if (page.readability.flesch !== null) {
      lines.push(`      Lesbarkeit:  ${page.readability.flesch} (${page.readability.formula}), `
        + `ø ${page.readability.wordsPerSentence} Wörter/Satz, ${page.readability.words} Wörter`);
    }
  }
  lines.push('');

  const bySeverity = { fehler: [], warnung: [], hinweis: [] };
  for (const finding of result.findings) bySeverity[finding.severity].push(finding);

  lines.push(`BEFUNDE: ${bySeverity.fehler.length} Fehler, ${bySeverity.warnung.length} Warnungen, ${bySeverity.hinweis.length} Hinweise`);
  lines.push('');
  for (const severity of ['fehler', 'warnung', 'hinweis']) {
    if (bySeverity[severity].length === 0) continue;
    lines.push(severity.toUpperCase());
    for (const finding of bySeverity[severity]) {
      lines.push(`  [${finding.area}] ${finding.page}`);
      lines.push(`      ${finding.text}`);
      lines.push(`      -> ${finding.fix}`);
    }
    lines.push('');
  }

  lines.push('NICHT GEPRÜFT');
  for (const entry of result.meta.notMeasured) lines.push(`  - ${entry}`);
  lines.push('');
  lines.push('HINWEISE ZUR INTERPRETATION');
  for (const entry of result.meta.caveats) lines.push(`  - ${entry}`);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Argumente
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    targets: [], site: null, maxPages: 5, json: false, out: null,
    linkSample: 15, imageSample: 10, sitemapSample: 5, checkHreflangReturn: true,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') opts.json = true;
    else if (arg === '--site') opts.site = argv[++i];
    else if (arg === '--max-pages') opts.maxPages = Number.parseInt(argv[++i], 10) || opts.maxPages;
    else if (arg === '--link-sample') opts.linkSample = Number.parseInt(argv[++i], 10) || opts.linkSample;
    else if (arg === '--image-sample') opts.imageSample = Number.parseInt(argv[++i], 10) || opts.imageSample;
    else if (arg === '--no-hreflang-return') opts.checkHreflangReturn = false;
    else if (arg === '--out') opts.out = argv[++i];
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (!arg.startsWith('--')) opts.targets.push(arg);
  }
  return opts;
}

function printHelp() {
  process.stdout.write(`seo-scan.mjs — technischer SEO-Check

Verwendung:
  node seo-scan.mjs <url> [weitere urls...] [optionen]
  node seo-scan.mjs --site https://example.com [optionen]

Optionen:
  --max-pages <n>         Maximale Anzahl geprüfter Seiten (Standard: 5)
  --link-sample <n>       Interne Links pro Seite, die auf Status geprüft werden (Standard: 15)
  --image-sample <n>      Bilder pro Seite, deren Dateigröße geprüft wird (Standard: 10)
  --no-hreflang-return    Reziprozitätsprüfung der hreflang-Verweise überspringen
  --json                  JSON zusätzlich zur Textausgabe
  --out <datei>           JSON in Datei schreiben

Ohne URL-Argumente werden Seiten aus der Sitemap gezogen.
`);
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help || (opts.targets.length === 0 && !opts.site)) {
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
