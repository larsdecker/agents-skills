#!/usr/bin/env node
/**
 * perf-scan.mjs — Performance-Budget-Check gegen Ressourcengewicht und
 * Lade-Strategie, ohne echten Browser.
 *
 * Prüft ausschließlich, was aus der HTML-Antwort und HTTP-Headern maschinell
 * ableitbar ist: Ressourcengewicht (JS/CSS/Bilder), Requestanzahl,
 * Drittanbieter-Origins, Render-Blocking-Ressourcen, Kompression,
 * Cache-Header, Font-Ladestrategie und ein optionales CI-Budget-Gate
 * (lighthouserc.json o. ä.) im aktuellen Arbeitsverzeichnis.
 *
 * Misst NICHT LCP, INP, CLS oder TBT selbst — dafür braucht es einen echten
 * Browser (Lighthouse) oder Felddaten (RUM/CrUX). Siehe SKILL.md und
 * references/budget-defaults.md für die Begründung.
 *
 * Prüft NICHT Bildattribute (width/height, loading="lazy", alt) — das ist
 * Aufgabe des Skills "seo-check", um keine widersprüchlichen Befunde zu
 * erzeugen.
 *
 * Führt nur lesende HTTP-Anfragen aus (GET, HEAD) sowie lesende
 * Dateisystemzugriffe im aktuellen Verzeichnis. Verändert nichts.
 * Keine Abhängigkeiten. Node >= 18.
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';

const USER_AGENT = 'perf-budget-check-skill/0.1 (+https://lars-decker.eu/skills/perf-budget-check)';
const REQUEST_TIMEOUT_MS = 15_000;
const POLITENESS_DELAY_MS = 300;

// Startwerte aus den öffentlich diskutierten "guten" Zielen für mobile,
// content-lastige Seiten (siehe references/budget-defaults.md). Mit
// --budget <datei> überschreibbar — Werte hier ändern statt Befunde
// nachträglich zu filtern.
const BUDGETS = {
  jsBytesMax: 200 * 1024,
  cssBytesMax: 60 * 1024,
  atfImageBytesMax: 300 * 1024,
  requestsMax: 50,
  thirdPartyOriginsMax: 2,
  cacheControlMinMaxAge: 7 * 24 * 3600,
  atfImageSampleSize: 3,
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
      contentEncoding: response.headers.get('content-encoding') || '',
      cacheControl: response.headers.get('cache-control') || '',
      body,
      url,
    };
  } catch (error) {
    return { ok: false, status: 0, error: error.message, body: '', url };
  } finally {
    clearTimeout(timer);
  }
}

/** Folgt Redirects manuell (GET), um am Endziel zu landen. */
async function requestFollowing(url, maxHops = 6) {
  let current = url;
  for (let hop = 0; hop < maxHops; hop += 1) {
    const response = await request(current, 'GET');
    if (response.status >= 300 && response.status < 400 && response.location) {
      current = new URL(response.location, current).href;
      continue;
    }
    return { ...response, finalUrl: current };
  }
  return { ok: false, status: 0, error: 'zu viele Redirects', finalUrl: current, body: '' };
}

/**
 * Misst die tatsächlich übertragene Bytezahl ohne Dekomprimierung. Viele CDNs
 * (Cloudflare, Vercel) streamen Brotli/Gzip ohne Content-Length-Header — weder
 * auf HEAD noch auf GET. `fetch()` dekomprimiert außerdem automatisch, bevor
 * der Aufrufer die Größe sehen kann. Nur ein rohes GET über node:http(s), das
 * die Antwort byteweise zählt statt sie zu interpretieren, liefert die reale
 * Transfergröße — und damit das, was ein Byte-Budget eigentlich meint.
 */
function measureTransferBytes(url, maxHops = 4) {
  return new Promise((resolve) => {
    const attempt = (current, hopsLeft) => {
      let mod;
      try {
        mod = new URL(current).protocol === 'https:' ? https : http;
      } catch {
        resolve({ ok: false, status: 0, bytes: 0, contentEncoding: '', cacheControl: '' });
        return;
      }
      const req = mod.request(current, {
        method: 'GET',
        headers: { 'User-Agent': USER_AGENT, Accept: '*/*', 'Accept-Encoding': 'gzip, br' },
        timeout: REQUEST_TIMEOUT_MS,
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && hopsLeft > 0) {
          res.resume();
          attempt(new URL(res.headers.location, current).href, hopsLeft - 1);
          return;
        }
        let bytes = 0;
        res.on('data', (chunk) => { bytes += chunk.length; });
        res.on('end', () => resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          bytes,
          contentEncoding: res.headers['content-encoding'] || '',
          cacheControl: res.headers['cache-control'] || '',
        }));
        res.on('error', () => resolve({ ok: false, status: res.statusCode || 0, bytes, contentEncoding: '', cacheControl: '' }));
      });
      req.on('error', () => resolve({ ok: false, status: 0, bytes: 0, contentEncoding: '', cacheControl: '' }));
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0, bytes: 0, contentEncoding: '', cacheControl: '' }); });
      req.end();
    };
    attempt(url, maxHops);
  });
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
  return { text: match ? match[1] : '', endIndex: match ? match.index + match[0].length : 0 };
}

function attr(tag, name) {
  const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s">]+))`, 'i').exec(tag);
  if (!match) return null;
  return match[2] ?? match[3] ?? match[4] ?? null;
}

function hasAttr(tag, name) {
  return new RegExp(`\\b${name}\\b`, 'i').test(tag);
}

function resolveUrl(href, base) {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

/** Grobe Heuristik für einen versionierten/gehashten Dateinamen (Cache-Busting). */
function looksHashed(pathname) {
  return /[.-][a-f0-9]{8,}\.(js|css)$/i.test(pathname) || /\?.*\b(v|version|hash)=/i.test(pathname);
}

function maxAgeSeconds(cacheControl) {
  const match = /max-age=(\d+)/i.exec(cacheControl || '');
  return match ? Number.parseInt(match[1], 10) : null;
}

// ---------------------------------------------------------------------------
// Ressourcen aus dem HTML extrahieren
// ---------------------------------------------------------------------------

function extractResources(html, pageUrl) {
  const { text: head, endIndex: headEnd } = headSection(html);
  const origin = new URL(pageUrl).origin;

  const scripts = matchAll(html, /<script\b[^>]*>/gi).map((match) => {
    const tag = match[0];
    const src = attr(tag, 'src');
    return {
      src,
      absolute: src ? resolveUrl(src, pageUrl) : null,
      inHead: match.index < headEnd,
      defer: hasAttr(tag, 'defer'),
      async: hasAttr(tag, 'async'),
      module: (attr(tag, 'type') || '').toLowerCase() === 'module',
      inline: !src,
    };
  });

  const stylesheets = matchAll(html, /<link\b[^>]*>/gi)
    .map((match) => match[0])
    .filter((tag) => (attr(tag, 'rel') || '').toLowerCase().split(/\s+/).includes('stylesheet'))
    .map((tag) => ({
      href: attr(tag, 'href'),
      absolute: attr(tag, 'href') ? resolveUrl(attr(tag, 'href'), pageUrl) : null,
      media: (attr(tag, 'media') || '').toLowerCase(),
    }));

  const preconnects = matchAll(head, /<link\b[^>]*>/gi)
    .map((match) => match[0])
    .filter((tag) => ['preconnect', 'dns-prefetch'].includes((attr(tag, 'rel') || '').toLowerCase()))
    .map((tag) => attr(tag, 'href'))
    .filter(Boolean);

  const images = matchAll(html, /<img\b[^>]*>/gi).map((match, index) => {
    const tag = match[0];
    const src = attr(tag, 'src') || attr(tag, 'data-src');
    return { position: index, src, absolute: src ? resolveUrl(src, pageUrl) : null };
  });

  const iframes = matchAll(html, /<iframe\b[^>]*>/gi)
    .map((match) => attr(match[0], 'src'))
    .filter(Boolean)
    .map((src) => resolveUrl(src, pageUrl))
    .filter(Boolean);

  const thirdPartyOrigins = new Set();
  for (const resource of [...scripts.filter((s) => s.absolute), ...iframes.map((src) => ({ absolute: src }))]) {
    const url = resource.absolute || resource;
    if (!url) continue;
    try {
      const resourceOrigin = new URL(url).origin;
      if (resourceOrigin !== origin) thirdPartyOrigins.add(resourceOrigin);
    } catch {
      // ignorieren
    }
  }

  return { scripts, stylesheets, preconnects, images, iframes, thirdPartyOrigins, origin };
}

// ---------------------------------------------------------------------------
// CI-Budget-Gate (lokales Dateisystem, best effort)
// ---------------------------------------------------------------------------

const CI_CONFIG_CANDIDATES = ['lighthouserc.json', '.lighthouserc.json', 'lighthouserc.js', '.lighthouserc.js'];
const CI_METRIC_MARKERS = [
  'largest-contentful-paint',
  'cumulative-layout-shift',
  'total-blocking-time',
  'interactive',
  'total-byte-weight',
  'resource-summary',
];

function checkCiGate(repoDir) {
  for (const candidate of CI_CONFIG_CANDIDATES) {
    const full = path.join(repoDir, candidate);
    if (!fs.existsSync(full)) continue;
    let content = '';
    try {
      content = fs.readFileSync(full, 'utf8');
    } catch {
      return { present: true, file: candidate, readable: false, coversMetrics: [] };
    }
    const coversMetrics = CI_METRIC_MARKERS.filter((marker) => content.includes(marker));
    return { present: true, file: candidate, readable: true, coversMetrics };
  }
  return { present: false, file: null, readable: false, coversMetrics: [] };
}

// ---------------------------------------------------------------------------
// Seite analysieren
// ---------------------------------------------------------------------------

async function analyzePage(url, opts) {
  const response = await requestFollowing(url);
  if (!response.ok) {
    return { url, ok: false, status: response.status, error: response.error };
  }

  const html = response.body;
  const pageUrl = response.finalUrl;
  const resources = extractResources(html, pageUrl);

  // JS-Gewicht, Kompression, Caching, Render-Blocking — ein Durchgang pro Script.
  let jsBytes = 0;
  let jsUncompressedCount = 0;
  const renderBlockingScripts = [];
  const cacheIssues = [];
  const externalScripts = resources.scripts.filter((s) => s.absolute);
  for (const script of externalScripts.slice(0, opts.assetSample)) {
    const meta = await measureTransferBytes(script.absolute);
    if (meta.bytes) jsBytes += meta.bytes;
    if (meta.bytes > 1024 && !meta.contentEncoding) jsUncompressedCount += 1;
    if (script.inHead && !script.defer && !script.async && !script.module) {
      renderBlockingScripts.push(script.src);
    }
    const pathname = new URL(script.absolute).pathname;
    if (looksHashed(pathname)) {
      const age = maxAgeSeconds(meta.cacheControl);
      if (age === null || age < BUDGETS.cacheControlMinMaxAge) {
        cacheIssues.push({ href: script.src, cacheControl: meta.cacheControl || '(fehlt)' });
      }
    }
    await sleep(POLITENESS_DELAY_MS / 2);
  }

  // CSS-Gewicht + Font-Display + @import. Größe kommt aus der Rohübertragung,
  // Textinhalt (für @font-face/@import) separat über das dekomprimierende
  // fetch()-basierte request().
  let cssBytes = 0;
  let cssUncompressedCount = 0;
  const fontDisplayMissing = [];
  const cssImports = [];
  for (const sheet of resources.stylesheets.filter((s) => s.absolute).slice(0, opts.assetSample)) {
    const meta = await measureTransferBytes(sheet.absolute);
    if (meta.bytes) cssBytes += meta.bytes;
    if (meta.bytes > 1024 && !meta.contentEncoding) cssUncompressedCount += 1;
    const full = await request(sheet.absolute, 'GET');
    if (full.ok && full.body) {
      const fontFaceBlocks = matchAll(full.body, /@font-face\s*\{[^}]*\}/gi).map((m) => m[0]);
      if (fontFaceBlocks.some((block) => !/font-display/i.test(block))) {
        fontDisplayMissing.push(sheet.href);
      }
      if (/@import\b/i.test(full.body)) cssImports.push(sheet.href);
    }
    await sleep(POLITENESS_DELAY_MS / 2);
  }

  // Above-the-fold-Bildgewicht (Positions-Näherung, kein echter Viewport)
  let atfImageBytes = 0;
  const atfCandidates = resources.images.filter((i) => i.absolute).slice(0, BUDGETS.atfImageSampleSize);
  for (const image of atfCandidates) {
    const meta = await measureTransferBytes(image.absolute);
    if (meta.bytes) atfImageBytes += meta.bytes;
    await sleep(POLITENESS_DELAY_MS / 2);
  }

  // Preconnect-Abdeckung für Drittanbieter-Origins
  const preconnectOrigins = new Set(
    resources.preconnects.map((href) => {
      try {
        return new URL(href).origin;
      } catch {
        return null;
      }
    }).filter(Boolean),
  );
  const missingPreconnect = [...resources.thirdPartyOrigins].filter((origin) => !preconnectOrigins.has(origin));

  const requestCount = resources.scripts.filter((s) => s.src).length
    + resources.stylesheets.length
    + resources.images.length
    + resources.iframes.length;

  return {
    url: pageUrl,
    ok: true,
    jsBytes,
    jsUncompressedCount,
    cssBytes,
    cssUncompressedCount,
    atfImageBytes,
    atfImageSampled: atfCandidates.length,
    requestCount,
    thirdPartyOrigins: [...resources.thirdPartyOrigins],
    renderBlockingScripts,
    fontDisplayMissing,
    cssImports,
    cacheIssues,
    missingPreconnect,
  };
}

// ---------------------------------------------------------------------------
// Befunde
// ---------------------------------------------------------------------------

function buildFindings(result) {
  const findings = [];
  const add = (severity, area, page, text, fix) => findings.push({ severity, area, page, text, fix });

  for (const page of result.pages) {
    if (!page.ok) {
      add('fehler', 'Erreichbarkeit', page.url, `Seite nicht abrufbar (${page.error || `Status ${page.status}`}).`,
        'Erreichbarkeit prüfen, bevor Budgets einen Sinn ergeben.');
      continue;
    }
    const label = new URL(page.url).pathname;

    if (page.jsBytes > result.budgets.jsBytesMax) {
      add('fehler', 'JS-Budget', label,
        `JavaScript (Stichprobe): ${Math.round(page.jsBytes / 1024)} KB, Budget ${Math.round(result.budgets.jsBytesMax / 1024)} KB.`,
        'Code-Splitting, Routen-Level Lazy-Loading, ungenutzten Code entfernen. Siehe Skill "perf-budget-fix".');
    }
    if (page.cssBytes > result.budgets.cssBytesMax) {
      add('fehler', 'CSS-Budget', label,
        `CSS (Stichprobe): ${Math.round(page.cssBytes / 1024)} KB, Budget ${Math.round(result.budgets.cssBytesMax / 1024)} KB.`,
        'Ungenutztes CSS entfernen (Critical-CSS-Tooling), Component-Libraries prüfen, ob sie ungenutzte Varianten mitliefern.');
    }
    if (page.atfImageBytes > result.budgets.atfImageBytesMax) {
      add('warnung', 'Bild-Budget', label,
        `Erste ${page.atfImageSampled} Bilder (Positions-Näherung für "above the fold"): ${Math.round(page.atfImageBytes / 1024)} KB, Budget ${Math.round(result.budgets.atfImageBytesMax / 1024)} KB.`,
        'Moderneres Format (AVIF/WebP), auf Darstellungsgröße zuschneiden, responsive srcset.');
    }
    if (page.requestCount > result.budgets.requestsMax) {
      add('warnung', 'Requests', label,
        `${page.requestCount} im HTML referenzierte Requests, Budget ${result.budgets.requestsMax}.`,
        'Ressourcen bündeln oder entfernen; prüfen, ob alle Drittanbieter-Skripte nötig sind.');
    }
    if (page.thirdPartyOrigins.length > result.budgets.thirdPartyOriginsMax) {
      add('warnung', 'Drittanbieter', label,
        `${page.thirdPartyOrigins.length} unterschiedliche Drittanbieter-Origins: ${page.thirdPartyOrigins.join(', ')}.`,
        'Auf die geschäftskritischen reduzieren; Rest verzögert (nach Consent oder Interaktion) laden.');
    }
    if (page.renderBlockingScripts.length > 0) {
      add('warnung', 'Render-Blocking', label,
        `${page.renderBlockingScripts.length} synchrones Script im <head> ohne defer/async/module: ${page.renderBlockingScripts.slice(0, 3).join(', ')}.`,
        'defer setzen (Ausführungsreihenfolge bleibt erhalten) oder ans Ende von <body> verschieben.');
    }
    if (page.jsUncompressedCount > 0 || page.cssUncompressedCount > 0) {
      add('fehler', 'Kompression', label,
        `${page.jsUncompressedCount + page.cssUncompressedCount} Text-Ressourcen ohne erkennbares Content-Encoding (gzip/br).`,
        'Kompression am Server oder CDN aktivieren — meist die wirksamste Einzelmaßnahme fürs Byte-Budget.');
    }
    if (page.fontDisplayMissing.length > 0) {
      add('hinweis', 'Fonts', label,
        `@font-face ohne font-display in: ${page.fontDisplayMissing.slice(0, 3).join(', ')}.`,
        'font-display: swap ergänzen, damit Text sichtbar bleibt, während die Schrift lädt.');
    }
    if (page.cssImports.length > 0) {
      add('hinweis', 'CSS', label,
        `@import in: ${page.cssImports.slice(0, 3).join(', ')}. Jedes @import ist ein zusätzlicher sequenzieller Request, bevor die Seite weiter rendern kann.`,
        'Dateien serverseitig zu einer Datei bündeln statt per @import zu verketten.');
    }
    if (page.missingPreconnect.length > 0) {
      add('hinweis', 'Resource Hints', label,
        `Kein preconnect für: ${page.missingPreconnect.slice(0, 3).join(', ')}.`,
        '<link rel="preconnect"> für Origins ergänzen, die früh im Ladevorgang gebraucht werden (Fonts, Skript-CDNs).');
    }
    for (const issue of page.cacheIssues) {
      add('hinweis', 'Caching', label,
        `Gehashte Datei ohne langlebiges Caching: ${issue.href} (Cache-Control: ${issue.cacheControl}).`,
        'Für Dateien mit Hash im Namen ist der Inhalt bei Änderung ohnehin eine neue URL — max-age=31536000, immutable ist sicher.');
    }
  }

  if (!result.ciGate.present) {
    add('hinweis', 'CI-Governance', '(Projektverzeichnis)',
      'Kein lighthouserc.json (oder .lighthouserc.json/.js) im aktuellen Arbeitsverzeichnis gefunden.',
      'Budget in CI erzwingen, sonst schleichen Regressionen unbemerkt ein. Vorlage in references/lighthouserc-template.md.');
  } else if (result.ciGate.readable && result.ciGate.coversMetrics.length < 3) {
    add('hinweis', 'CI-Governance', '(Projektverzeichnis)',
      `${result.ciGate.file} gefunden, deckt aber nur ${result.ciGate.coversMetrics.length} der geprüften Metrik-Familien ab (${result.ciGate.coversMetrics.join(', ') || 'keine erkannt'}).`,
      'Mindestens LCP, CLS und Byte-Gewicht als assert-Schwellen ergänzen.');
  }

  const order = { fehler: 0, warnung: 1, hinweis: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity] || a.area.localeCompare(b.area));
  return findings;
}

// ---------------------------------------------------------------------------
// Ablauf
// ---------------------------------------------------------------------------

async function run(opts) {
  const pages = [];
  for (const url of opts.targets) {
    pages.push(await analyzePage(url, opts));
    await sleep(POLITENESS_DELAY_MS);
  }

  const result = {
    meta: {
      generatedAt: new Date().toISOString(),
      pagesChecked: pages.length,
      userAgent: USER_AGENT,
      budgets: resolveBudgets(opts),
      notMeasured: [
        'LCP, INP, CLS, TBT: brauchen einen echten Browser (Lighthouse) oder Felddaten (RUM/CrUX). Dieser Scan misst nur bekannte Auslöser und Ressourcengewicht.',
        'Bildattribute (width/height, loading="lazy", alt): bewusst nicht Teil dieses Scans, siehe Skill "seo-check".',
        'Tatsächliche Interaktivität und Hauptthread-Blockierung: nur über Bytegewicht angenähert, nicht gemessen.',
        'JavaScript-nachgeladene Requests (z. B. durch Client-Routing): nicht erfasst — nur, was im initialen HTML referenziert ist.',
      ],
      caveats: [
        '"Above the fold" ist eine Positions-Näherung (erste Bilder im HTML), kein echter Viewport-Test.',
        'Ressourcengrößen sind reale Transferbytes aus einem unkomprimierten Roh-GET (node:http/https, keine Dekomprimierung) — nicht der oft fehlende Content-Length-Header. Das ist die übertragene, komprimierte Größe, keine entpackte Bundle-Größe.',
        'Drittanbieter-Erkennung vergleicht nur den Hostnamen mit der Seiten-Origin, keine eTLD+1-Auflösung.',
        'CI-Budget-Gate wird im aktuellen Arbeitsverzeichnis gesucht — bei einem reinen URL-Scan ohne lokales Repo bleibt dieser Punkt naturgemäß ohne Befund.',
      ],
    },
    budgets: resolveBudgets(opts),
    ciGate: opts.ciGate,
    pages,
  };
  result.findings = buildFindings(result);
  return result;
}

function resolveBudgets(opts) {
  return { ...BUDGETS, ...opts.budgetOverrides };
}

// ---------------------------------------------------------------------------
// Ausgabe
// ---------------------------------------------------------------------------

function renderText(result) {
  const lines = [];
  lines.push('PERF-BUDGET-CHECK');
  lines.push(`Geprüfte Seiten: ${result.meta.pagesChecked}`);
  lines.push('');

  lines.push('BUDGETS');
  lines.push(`  JS:              ${Math.round(result.budgets.jsBytesMax / 1024)} KB`);
  lines.push(`  CSS:             ${Math.round(result.budgets.cssBytesMax / 1024)} KB`);
  lines.push(`  ATF-Bilder:      ${Math.round(result.budgets.atfImageBytesMax / 1024)} KB`);
  lines.push(`  Requests:        ${result.budgets.requestsMax}`);
  lines.push(`  Drittanbieter:   ${result.budgets.thirdPartyOriginsMax} Origins`);
  lines.push('');

  lines.push(`CI-BUDGET-GATE: ${result.ciGate.present ? `${result.ciGate.file} gefunden` : 'nicht gefunden'}`);
  lines.push('');

  lines.push('SEITEN');
  for (const page of result.pages) {
    if (!page.ok) {
      lines.push(`  ${page.url} — FEHLER: ${page.error || `Status ${page.status}`}`);
      continue;
    }
    const label = new URL(page.url).pathname;
    lines.push(`  ${label}`);
    lines.push(`      JS (Stichprobe):   ${Math.round(page.jsBytes / 1024)} KB`);
    lines.push(`      CSS (Stichprobe):  ${Math.round(page.cssBytes / 1024)} KB`);
    lines.push(`      ATF-Bilder:        ${Math.round(page.atfImageBytes / 1024)} KB (${page.atfImageSampled} geprüft)`);
    lines.push(`      Requests:          ${page.requestCount}`);
    lines.push(`      Drittanbieter:     ${page.thirdPartyOrigins.length} (${page.thirdPartyOrigins.join(', ') || '–'})`);
    lines.push(`      Render-Blocking:   ${page.renderBlockingScripts.length} Script(s)`);
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

  lines.push('NICHT GEMESSEN');
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
    targets: [], json: false, out: null, assetSample: 20,
    budgetOverrides: {}, repoDir: process.cwd(),
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') opts.json = true;
    else if (arg === '--site') opts.targets.push(argv[++i]);
    else if (arg === '--asset-sample') opts.assetSample = Number.parseInt(argv[++i], 10) || opts.assetSample;
    else if (arg === '--repo-dir') opts.repoDir = argv[++i];
    else if (arg === '--budget') {
      const file = argv[++i];
      try {
        opts.budgetOverrides = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch (error) {
        process.stderr.write(`Konnte --budget-Datei nicht lesen: ${error.message}\n`);
        process.exitCode = 1;
      }
    } else if (arg === '--out') opts.out = argv[++i];
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (!arg.startsWith('--')) opts.targets.push(arg);
  }
  opts.ciGate = checkCiGate(opts.repoDir);
  return opts;
}

function printHelp() {
  process.stdout.write(`perf-scan.mjs — Performance-Budget-Check (Ressourcengewicht, ohne echten Browser)

Verwendung:
  node perf-scan.mjs <url> [weitere urls...] [optionen]
  node perf-scan.mjs --site https://example.com [optionen]

Optionen:
  --asset-sample <n>   Externe Skripte/Stylesheets pro Seite, die geprüft werden (Standard: 20)
  --budget <datei>     JSON mit Budget-Overrides, z. B. {"jsBytesMax": 150000}
  --repo-dir <pfad>    Verzeichnis für die CI-Budget-Gate-Prüfung (Standard: aktuelles Verzeichnis)
  --json               JSON zusätzlich zur Textausgabe
  --out <datei>        JSON in Datei schreiben

Misst kein LCP/INP/CLS/TBT — dafür braucht es Lighthouse oder Felddaten. Siehe SKILL.md.
`);
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help || opts.targets.length === 0) {
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
