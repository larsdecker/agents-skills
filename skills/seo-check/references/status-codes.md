# Statuscodes und Weiterleitungen

## Codes und ihre SEO-Bedeutung

| Code | Bedeutung | Wirkung | Richtige Verwendung |
| :-- | :-- | :-- | :-- |
| **200** | OK | wird gecrawlt und indexiert | Zielzustand für alle indexierbaren Seiten |
| **301** | dauerhaft verschoben | überträgt nahezu alle Signale, Index wird auf das Ziel umgestellt | Umzüge, Domainwechsel, URL-Normalisierung |
| **302** | temporär | Original bleibt im Index, Signale bleiben dort | echte Provisorien, A/B-Tests, Wartung |
| **304** | nicht geändert | schont Crawl-Budget | korrekt implementiertes Caching |
| **307** | temporär, Methode bleibt | wie 302 | HSTS-Weiterleitung auf HTTPS |
| **308** | dauerhaft, Methode bleibt | wie 301 | dauerhafte Umleitung von POST-Endpunkten |
| **404** | nicht gefunden | wird mit der Zeit deindexiert | Seite existiert nicht, Wiederkehr möglich |
| **410** | dauerhaft entfernt | schnellere Deindexierung als 404 | bewusst gelöschte Inhalte |
| **429** | zu viele Anfragen | Crawling wird verlangsamt | nie für Crawler; Rate Limit prüfen |
| **5xx** | Serverfehler | Crawling wird gedrosselt, dauerhaft droht Indexverlust | immer ein Fehler |

## Die vier Fälle, die in der Praxis Schaden anrichten

**302 statt 301 bei einem dauerhaften Umzug.** Die alte URL bleibt im Index, die neue sammelt keine Signale. Bei einer Domain-Migration ist das der Unterschied zwischen einem Delle im Traffic und einem Totalverlust.

**Soft 404** — Status 200 mit „Seite nicht gefunden"-Inhalt. Schlechter als ein echter 404: Der Crawler verschwendet Budget auf einer Seite, die er für gültig hält, und der Index füllt sich mit wertlosen Einträgen. Häufige Ursache: eine SPA, die für unbekannte Routen eine Fehlerkomponente rendert, ohne den Status zu ändern.

**Weiterleitungsketten.** A → B → C verwässert Signale und kostet Crawl-Budget. Immer direkt auf das Endziel. Nach mehreren Migrationen entstehen solche Ketten schleichend; ein Scan über die internen Links deckt sie auf.

**Dauerhafte 5xx.** Google reduziert das Crawling messbar, wenn Serverfehler häufig auftreten. Bei anhaltenden Fehlern werden betroffene Seiten aus dem Index entfernt. Das ist der einzige Fall in dieser Tabelle, bei dem Nichtstun aktiv Schaden anrichtet.

## Regeln für interne Verlinkung

Interne Links **immer direkt auf die 200-URL**. Ein interner Link auf eine weiterleitende URL ist vermeidbarer Verlust im eigenen Haus: jeder Aufruf zahlt einen zusätzlichen Sprung, ohne dass jemand davon profitiert.

Das passiert typischerweise nach:

- Wechsel des Trailing-Slash-Schemas
- Umstellung von HTTP auf HTTPS
- Umbenennung von Kategorien oder Slugs

Nach jeder dieser Änderungen sind die internen Links zu aktualisieren, nicht nur die Weiterleitungen einzurichten. Die Weiterleitung ist das Sicherheitsnetz für externe Links, nicht die Lösung für eigene.

## Weiterleitungsschleifen

A → B → A ist ein Totalausfall: Die Seite ist für Crawler und Nutzer nicht erreichbar. Häufige Ursache sind zwei Regeln, die sich widersprechen — etwa eine Trailing-Slash-Normalisierung und eine Sprachumleitung, die gegeneinander arbeiten.

## Prüfung

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -I https://example.com/pfad
```

Für die vollständige Kette Weiterleitungen manuell verfolgen statt `-L` zu nutzen — sonst siehst du nur das Endergebnis und nicht, wie viele Sprünge es gebraucht hat. Das Scan-Script des Skills macht genau das und meldet die Kette.
