# Performance-Muster je Framework

**Vor jeder Änderung prüfen, ob die Plattform das Problem schon löst.** Auf Vercel, Netlify und hinter Cloudflare ist Kompression praktisch immer aktiv, und viele CDNs setzen bereits sinnvolle Cache-Header für Static Assets. Ein Fix am Anwendungscode für etwas, das eine Konfigurationszeile auf der Plattform wäre, ist verlorene Arbeit — prüfe die tatsächlich ausgelieferten Header (`curl -sI`), bevor du Code änderst.

---

## Next.js (App Router)

**Scripts:** `next/script` statt eines rohen `<script>`-Tags — die `strategy`-Prop bildet die Ladestrategie ab, ohne dass du `defer`/`async` selbst verwalten musst.

```tsx
import Script from 'next/script';

<Script src="https://example.com/widget.js" strategy="lazyOnload" />
```

| `strategy` | Wirkung |
| :-- | :-- |
| `beforeInteractive` | Blockiert bewusst — nur für Skripte, die vor jeder Interaktion laufen müssen (Consent-Management, Polyfills). |
| `afterInteractive` (Standard) | Lädt nach der Hydration. Passend für die meisten Analytics-Skripte. |
| `lazyOnload` | Lädt erst, wenn der Browser idle ist. Passend für Chat-Widgets, nicht-kritische Drittanbieter. |

**Fonts:** `next/font` statt einem externen `<link>` zu Google Fonts o. ä. — selbst hostend, mit automatischem `font-display: swap` und ohne zusätzlichen Drittanbieter-Origin.

```tsx
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], display: 'swap' });
```

**Code-Splitting:** `next/dynamic` für alles, was nicht beim ersten Render sichtbar ist.

```tsx
import dynamic from 'next/dynamic';
const HeavyChart = dynamic(() => import('./HeavyChart'), { ssr: false });
```

**Bundle-Analyse:** `@next/bundle-analyzer` zeigt, welches Modul tatsächlich zum JS-Gewicht beiträgt, bevor du am Verdacht statt am Befund arbeitest.

**Kompression:** `compress: true` in `next.config.js` ist der Node-Server-Standard — auf Vercel übernimmt die Plattform das ohnehin, die Einstellung ist dort wirkungslos, aber harmlos.

---

## Nuxt 3

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  app: { head: { /* … */ } },
  nitro: { compressPublicAssets: true },
});
```

**Code-Splitting:** `defineAsyncComponent` für schwere, nicht sofort sichtbare Komponenten.

**Fonts:** `@nuxt/fonts`-Modul übernimmt Selbst-Hosting und `font-display` analog zu `next/font`.

**Bilder:** `@nuxt/image` für Format-Konvertierung und responsive Größen — nicht Teil dieses Skills (siehe `seo-fix`), aber dieselbe Empfehlung gilt für die Ladestrategie: `loading="lazy"` nur unterhalb der ersten Ansicht.

---

## Astro

Astro liefert standardmäßig null JavaScript aus, bis eine Insel es explizit anfordert — die üblichen JS-Bytebudget-Probleme entstehen hier meist durch zu großzügige `client:*`-Direktiven.

```astro
<HeavyWidget client:visible />
```

| Direktive | Lädt |
| :-- | :-- |
| `client:load` | Sofort — nur für wirklich sofort interaktive Komponenten. |
| `client:idle` | Wenn der Hauptthread frei ist. |
| `client:visible` | Wenn die Komponente in den Viewport scrollt — passend für alles unterhalb der ersten Ansicht. |

Der häufigste Fix hier ist, `client:load` durch `client:visible` oder `client:idle` zu ersetzen, nicht Code zu splitten, der es architekturbedingt schon ist.

---

## SvelteKit

**Code-Splitting:** dynamisches `import()` innerhalb eines Event-Handlers oder eines `onMount`, statt eines statischen Top-Level-Imports.

```svelte
<script>
  async function openEditor() {
    const { default: Editor } = await import('./Editor.svelte');
    // …
  }
</script>
```

**Kompression:** über `vite-plugin-compression` oder die Serverkonfiguration des Adapters (z. B. `@sveltejs/adapter-node` hinter nginx).

---

## Vue (ohne Meta-Framework)

```ts
const HeavyChart = defineAsyncComponent(() => import('./HeavyChart.vue'));
```

Reine Client-Side-Rendering-Setups haben ein strukturelles Problem, das kein Byte-Budget-Fix löst: Der initiale HTML-Response ist praktisch leer, und die gesamte "Zeit bis Inhalt sichtbar ist" hängt am JS-Bundle. Wenn das Budget strukturell nicht einhaltbar ist, ist SSR/SSG die eigentliche Lösung — das ist eine Architekturentscheidung, keine, die dieser Skill trifft.

---

## Statische HTML-Seiten / eigener Server

**Scripts manuell verzögern:**

```html
<script src="/widget.js" defer></script>
```

**Resource Hints:**

```html
<link rel="preconnect" href="https://fonts.example.com" crossorigin>
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
```

**Kompression (nginx):**

```nginx
gzip on;
gzip_types text/css application/javascript application/json;
# Besser, wenn verfügbar:
brotli on;
brotli_types text/css application/javascript application/json;
```

**Caching (nginx), nur für gehashte Dateinamen:**

```nginx
location ~* \.[a-f0-9]{8,}\.(js|css)$ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}
```

**Vor jeder Änderung an `nginx.conf` oder `.htaccess` eine Sicherung anlegen.** Ein Syntaxfehler legt die gesamte Site lahm — das größte Schadenspotenzial in dieser ganzen Datei.

---

## WordPress

Performance-Plugins (WP Rocket, Autoptimize, Perfmatics u. ä.) übernehmen Kompression, Caching und teils Skript-Verzögerung bereits. **Prüfe zuerst, ob eins aktiv ist und was es bereits abdeckt**, bevor du im Theme manuell eingreifst — zwei Mechanismen, die dasselbe Problem lösen wollen, sind eine häufige Ursache für unvorhersehbares Verhalten.

Drittanbieter-Skripte (Tracking, Chat-Widgets) kommen meist über ein Tag-Manager-Plugin. Die Ladestrategie dort konfigurieren, nicht im Theme-Code duplizieren.

---

## Edge-Umgebungen (Cloudflare Workers, Vercel Edge)

Kompression und ein Großteil des Cachings laufen hier auf der Plattform, nicht im Anwendungscode. Was in der Kontrolle des Projekts bleibt:

- **`Cache-Control`-Header**, die die Anwendung selbst setzt — die Plattform respektiert sie, erzeugt sie aber nicht von sich aus für dynamisch generierte Antworten.
- **Response-Größe der Funktion selbst** — Edge-Runtimes haben oft engere Zeit-/Speicherlimits als Node-Server; ein zu großes serverseitiges Rendering kann dort eher an eine Plattformgrenze stoßen als an ein klassisches Byte-Budget.

Nach jeder Änderung an Cache-Headern: mit `curl -sI` gegen die produktive URL prüfen, dass der Header tatsächlich ankommt — Edge-Konfigurationen überschreiben Anwendungs-Header teils stillschweigend.
