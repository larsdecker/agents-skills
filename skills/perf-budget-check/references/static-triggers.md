# Statische Signale und ihre Web-Vitals-Wirkung

Jedes Signal, das dieser Skill meldet, korreliert mit einer Web-Vitals-Metrik, misst sie aber nicht. Diese Tabelle macht die Verbindung explizit — und nennt, wann sie nicht gilt.

| Signal | Wirkt auf | Warum | Wann es NICHT gilt |
| :-- | :-- | :-- | :-- |
| Hohes JS-Gesamtgewicht | TBT, INP | Mehr JS bedeutet mehr Parse- und Ausführungszeit auf dem Hauptthread. | Bei stark asynchronem, gut aufgeteiltem Code kann viel Gesamt-JS trotzdem wenig Hauptthread-Zeit kosten. Bytegewicht ist eine Näherung, keine CPU-Messung. |
| Render-Blocking-Script im `<head>` | LCP, FCP | Der Browser muss das Skript laden und ausführen, bevor er mit dem Rendern fortfährt. | Ein bewusst blockierendes Consent- oder Feature-Detection-Skript kann so gewollt sein, wenn alles Nachfolgende von seinem Ergebnis abhängt. |
| Render-Blocking-CSS | LCP, FCP | CSS muss vollständig geladen sein, bevor der Browser den Render-Baum aufbaut. | Kleine, kritische Stylesheets sind kaum vermeidbar und meist unproblematisch — das Byte-Budget für CSS fängt die Größe ohnehin ein. |
| Fehlende Kompression (kein `content-encoding`) | Alle Byte-Budgets, TTFB indirekt | Unkomprimierter Text ist typischerweise 3–5× größer als mit Brotli/Gzip. | Bereits komprimierte Formate (Bilder, Videos, Fonts in WOFF2) profitieren kaum von zusätzlicher Textkompression — der Scan prüft das nur für Skripte und Stylesheets. |
| `@font-face` ohne `font-display` | CLS, gefühlte Ladezeit | Ohne `font-display` entscheidet der Browser-Standard über unsichtbaren Text während des Font-Ladens (FOIT) — Layout kann sich beim Einblenden verschieben. | Bei Systemfonts ohne `@font-face` gibt es kein Problem; der Scan meldet dann korrekt nichts. |
| `@import` in CSS | LCP, FCP | Jedes `@import` ist ein zusätzlicher sequenzieller Request, bevor der Browser weiß, welches CSS als Nächstes gebraucht wird. | Ein einzelnes `@import` für ein selten genutztes Print-Stylesheet mit `media="print"` blockiert das Rendern nicht in gleichem Maß. |
| Fehlendes `preconnect` für Drittanbieter-Origin | LCP (wenn die Ressource kritisch ist) | Ohne Preconnect fallen DNS-Lookup, TLS-Handshake und Verbindungsaufbau in die kritische Kette, statt parallel zum übrigen Ladevorgang zu laufen. | Für Origins, die erst nach der Interaktion gebraucht werden (z. B. ein Chat-Widget), ist ein früher Preconnect verschwendete Bandbreite — hier zählt eher `preconnect` beim Hover/Intent. |
| Kein langlebiges Caching auf gehashten Assets | Wiederholte Ladezeiten, nicht der erste Seitenaufruf | Eine Datei mit Hash im Namen ändert bei jeder inhaltlichen Änderung ihre URL — `max-age=31536000, immutable` ist ohne Risiko einer veralteten Auslieferung. | Nicht gehashte Assets (z. B. `/favicon.ico`) brauchen kürzere `max-age`, weil ein Update sonst erst nach Ablauf sichtbar wird — der Scan prüft das bewusst nur für gehashte Dateinamen. |
| Viele Drittanbieter-Origins | TBT, INP, Verfügbarkeitsrisiko | Jeder zusätzliche Origin kann eigenes JS ausführen und eigene Requests auslösen, außerhalb der Kontrolle des Projekts. | Origins, die nach Consent oder nach Interaktion nachgeladen werden, zählen im initialen Scan zwar mit (sie stehen im HTML), belasten den initialen Ladevorgang aber nicht in gleichem Maß wie synchron geladene. Prüfe die Lade-Strategie, nicht nur die Anzahl. |

## Was in dieser Tabelle bewusst fehlt

**Bildabmessungen (`width`/`height`) und `loading="lazy"` auf dem ersten Bild.** Beide sind bekannte CLS- respektive LCP-Auslöser — geprüft werden sie aber vom Skill `seo-check`, nicht von diesem. Zwei Skills, die dasselbe Bild-Tag prüfen, können sich widersprechen, wenn sie unterschiedliche Schwellwerte oder Formulierungen verwenden; deshalb hat jedes Signal genau eine zuständige Quelle.
