# Metadaten-Muster je Framework

**Vor jeder Änderung: prüfen, wie das Projekt es bereits macht.** Erweitere den vorhandenen Weg. Zwei konkurrierende Quellen für denselben Tag sind der häufigste Grund dafür, dass ein Fix nicht greift — und der Fehler ist im Code kaum zu sehen, weil beide Stellen für sich korrekt aussehen.

Ein zusätzliches SEO-Paket zu installieren, wo das Framework eine eigene API hat, erzeugt genau diese zweite Quelle.

---

## Next.js (App Router)

Metadaten kommen aus `metadata` oder `generateMetadata`. Kein manuelles `<head>`.

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Konkreter Seitentitel',
  description: '…',
  alternates: { canonical: 'https://example.com/pfad' },
  openGraph: {
    type: 'article',
    url: 'https://example.com/pfad',
    title: 'Konkreter Seitentitel',
    description: '…',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: '…' }],
  },
  twitter: { card: 'summary_large_image', images: ['/opengraph-image'] },
};
```

Dynamische Seiten:

```tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  return {
    title: { absolute: page.seoTitle },   // absolute umgeht die Vorlage aus dem Layout
    description: page.seoDescription,
    alternates: { canonical: `https://example.com/${slug}` },
  };
}
```

**Title-Vorlage** im Root-Layout, damit die Marke nicht in jeder Datei steht:

```tsx
export const metadata: Metadata = {
  title: { default: 'Marke', template: '%s | Marke' },
};
```

`title: { absolute: … }` auf einer Unterseite umgeht diese Vorlage. Das ist der Weg für Seiten, deren Title bereits vollständig ist — sonst entsteht „Titel | Marke | Marke".

**JSON-LD** als `<script>` in der Komponente:

```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
```

**Robots:**

```tsx
export const metadata: Metadata = { robots: { index: false, follow: true } };
```

**Sitemap und robots.txt** über `app/sitemap.ts` und `app/robots.ts`. Bei statischem Export zusätzlich ein Generator-Script, weil Route Handler dort nicht laufen.

**Echter 404:** `notFound()` aus `next/navigation` — nicht eine Fehlerkomponente rendern, sonst entsteht ein Soft 404 mit Status 200.

**Häufige Falle:** `dynamic = 'force-static'` bei gleichzeitig dynamischen Metadaten. Prüfe nach dem Build, ob die Route wie erwartet vorgerendert wird (`●` statt `ƒ` in der Build-Ausgabe).

---

## Next.js (Pages Router)

```tsx
import Head from 'next/head';

<Head>
  <title>Konkreter Seitentitel</title>
  <meta name="description" content="…" />
  <link rel="canonical" href="https://example.com/pfad" />
  <meta property="og:title" content="…" />
</Head>
```

`<Head>` erlaubt Duplikate über mehrere Komponenten hinweg. Setze pro Tag genau eine Stelle — der Scan meldet mehrfache Title-Tags, aber im Code sind sie schwer zu finden.

---

## Nuxt 3

```ts
useSeoMeta({
  title: 'Konkreter Seitentitel',
  description: '…',
  ogTitle: '…',
  ogImage: 'https://example.com/og.png',
  twitterCard: 'summary_large_image',
});

useHead({
  link: [{ rel: 'canonical', href: 'https://example.com/pfad' }],
  htmlAttrs: { lang: 'de' },
});
```

`useSeoMeta` ist gegenüber `useHead` zu bevorzugen: es kennt die Unterscheidung zwischen `property` und `name` und verhindert damit den häufigsten Open-Graph-Fehler.

---

## Astro

```astro
---
const canonical = new URL(Astro.url.pathname, Astro.site);
---
<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />
<meta property="og:title" content={title} />
<script type="application/ld+json" set:html={JSON.stringify(schema)} />
```

`Astro.site` in `astro.config.mjs` setzen, sonst sind Canonicals relativ.

---

## SvelteKit

```svelte
<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonical} />
</svelte:head>
```

---

## Vue mit vue-meta / @unhead/vue

```ts
useHead({
  title: 'Konkreter Seitentitel',
  meta: [
    { name: 'description', content: '…' },
    { property: 'og:title', content: '…' },
  ],
  link: [{ rel: 'canonical', href: '…' }],
});
```

Bei reinem Vue ohne SSR gilt Stufe 2 aus `fix-priority.md`: per JavaScript gesetzte Metadaten sind für die meisten Crawler nicht vorhanden. Ein Metadaten-Fix in einer reinen SPA behebt das Symptom, nicht die Ursache.

---

## Statische HTML-Seiten

```html
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Konkreter Seitentitel</title>
  <meta name="description" content="…">
  <link rel="canonical" href="https://example.com/pfad">
  <meta property="og:title" content="…">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://example.com/pfad">
  <meta property="og:image" content="https://example.com/og.png">
  <meta name="twitter:card" content="summary_large_image">
</head>
```

Bei mehreren Seiten: Vorlage plus Generator statt Copy-Paste. Sonst laufen die Seiten auseinander, und der nächste Fix muss n-mal angewandt werden.

---

## WordPress

Metadaten kommen aus einem SEO-Plugin (Yoast, Rank Math, SEOPress). **Nie zusätzlich im Theme setzen** — das erzeugt doppelte Tags.

Änderungen gehören in die Plugin-Einstellungen oder in dessen Filter-Hooks:

```php
add_filter('wpseo_canonical', function ($canonical) { /* … */ });
```

Zwei aktive SEO-Plugins gleichzeitig sind eine häufige Ursache für doppelte Tags. Prüfe das zuerst, wenn der Scan mehrfache Titles oder Descriptions meldet.

---

## Server-Header (X-Robots-Tag)

Für Nicht-HTML-Dateien wie PDFs — dort gibt es kein Meta-Tag.

**Nginx:**

```nginx
location ~* \.pdf$ {
  add_header X-Robots-Tag "noindex, nofollow";
}
```

**Apache:**

```apache
<FilesMatch "\.pdf$">
  Header set X-Robots-Tag "noindex, nofollow"
</FilesMatch>
```

**Vor jeder Änderung an `.htaccess` oder `nginx.conf` eine Sicherung anlegen.** Ein Syntaxfehler führt zu HTTP 500 auf der gesamten Site — das ist der Fehler mit dem höchsten Schadenspotenzial in dieser Datei.

Der Header überschreibt das Meta-Tag. Wenn eine Seite unerklärlich nicht indexiert wird und das Meta-Tag sauber ist, sind die Response-Header der erste Ort zum Suchen.

---

## Cloudflare Workers und Edge-Umgebungen

Metadaten werden normal über das Framework gesetzt. Zu beachten:

- **Dynamische Bildgenerierung** (`opengraph-image`) verhält sich in Edge-Runtimes anders als in Node. Font-Ladefehler und fehlende APIs führen dort zu HTTP 500 — und weil alle Seiten dasselbe Bild referenzieren, ist damit jede Social-Vorschau der Site defekt. Nach dem Deployment einmal direkt abrufen:

  ```bash
  curl -s -o /dev/null -w "%{http_code} %{content_type}\n" https://example.com/opengraph-image
  ```

  Wenn das kein `200` mit Bild-Content-Type liefert, ist ein statisches Bild die verlässlichere Lösung als eine Laufzeitgenerierung.

- **Route Handler bei statischem Export** laufen nicht. Sitemap, `robots.txt` und ähnliche Dateien brauchen dann ein Generator-Script im Build.
