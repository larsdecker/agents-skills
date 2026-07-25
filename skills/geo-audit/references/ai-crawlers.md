# KI-Crawler: Zweck, Auswirkung, Konsequenz

Die wichtigste Unterscheidung bei robots.txt-Entscheidungen ist **Retrieval gegen Training**. Wer sie nicht macht, blockiert entweder zu viel oder zu wenig – und zwar jeweils genau das Falsche.

**Retrieval** heißt: Der Bot holt eine Seite ab, weil ein Nutzer gerade eine Frage gestellt hat, und der Inhalt fließt mit Quellenangabe in die Antwort. Blockieren bedeutet hier: die Seite kann in dieser Antwort nicht auftauchen.

**Training** heißt: Der Inhalt wird für zukünftige Modellversionen gesammelt. Blockieren bedeutet hier: kein direkter Sichtbarkeitsverlust in Antworten, aber der Inhalt fehlt später im Weltwissen des Modells.

Wer Sichtbarkeit will und Trainingsnutzung ablehnt, kann beides haben: Retrieval-Bots erlauben, Training-Bots ausschließen. Das ist eine legitime, verbreitete Konfiguration – und kein halber Fehler.

---

## Übersicht

| Agent | Anbieter | Zweck | Blockieren kostet Sichtbarkeit |
| :-- | :-- | :-- | :-- |
| `Googlebot` | Google | Suche und AI Overviews | **kritisch** — ohne ihn keine AI Overviews |
| `Bingbot` | Microsoft | Suche und Copilot | **kritisch** — speist auch andere Dienste |
| `OAI-SearchBot` | OpenAI | Retrieval für ChatGPT-Suche | **hoch** |
| `ChatGPT-User` | OpenAI | Abruf auf Nutzeraktion | **hoch** |
| `Claude-SearchBot` | Anthropic | Retrieval für Suchergebnisse | **hoch** |
| `Claude-User` | Anthropic | Abruf auf Nutzeraktion | **hoch** |
| `PerplexityBot` | Perplexity | Index für Antworten | **hoch** |
| `Perplexity-User` | Perplexity | Abruf auf Nutzeraktion | **hoch** |
| `GPTBot` | OpenAI | Training | niedrig |
| `ClaudeBot` | Anthropic | Training | niedrig |
| `Google-Extended` | Google | Training für Gemini | niedrig — steuert **nicht** die Suche |
| `Applebot-Extended` | Apple | Training | niedrig |
| `CCBot` | Common Crawl | offener Datensatz, fließt in viele Modelle | niedrig, aber breit |
| `Meta-ExternalAgent` | Meta | Training | niedrig |
| `Bytespider` | ByteDance | Training | niedrig |
| `Amazonbot` | Amazon | Retrieval für Alexa | mittel |

Namen und Zwecke ändern sich. Prüfe im Zweifel die Crawler-Dokumentation des jeweiligen Anbieters, statt dich auf diese Tabelle zu verlassen – sie ist ein Ausgangspunkt, keine Autorität.

---

## Häufige Fehlkonfigurationen

**`Google-Extended` blockieren und Sichtbarkeitsverlust in der Suche befürchten.**
`Google-Extended` steuert ausschließlich die Trainingsnutzung für Gemini. Es hat keinen Einfluss auf die Google-Suche und keinen auf AI Overviews. Wer AI Overviews vermeiden will, kann das nur über `nosnippet`, `max-snippet` oder `data-nosnippet` beeinflussen – und verliert damit auch normale Snippets.

**Alle KI-Bots per Wildcard blockieren.**
Ein `User-agent: *` mit `Disallow: /` für „KI raushalten" trifft Googlebot und Bingbot mit und entfernt die Site aus der klassischen Suche. Das ist der teuerste Fehler in diesem Bereich.

**Retrieval blockieren, um Inhalte zu schützen.**
Retrieval-Bots holen die Seite ab, um sie mit Quellenangabe zu zitieren – das ist Zuweisung von Urheberschaft, nicht Aneignung. Wer hier blockiert, verhindert, dass die eigene Quelle genannt wird, während dieselbe Information aus zitierfähigen Fremdquellen weitergegeben wird.

**Auf robots.txt vertrauen, wo Zugriffsschutz nötig ist.**
robots.txt ist eine Bitte, kein Schutzmechanismus. Nicht alle Bots halten sich daran. Vertrauliche Inhalte brauchen Authentifizierung.

---

## Vorlage: Retrieval erlauben, Training ausschließen

```
# Klassische Suche und Antwortmaschinen: vollständiger Zugang
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

# Trainingsnutzung ausgeschlossen
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Meta-ExternalAgent
Disallow: /

User-agent: Bytespider
Disallow: /

# Standardregel
User-agent: *
Allow: /

Sitemap: https://example.com/sitemap.xml
```

Wichtig zur Wirkungsweise: Ein Crawler wertet **nur die für ihn spezifischste Gruppe** aus. Findet er eine Gruppe mit seinem Namen, ignoriert er `User-agent: *` vollständig. Regeln aus mehreren Gruppen werden nicht kombiniert – ein häufiger Irrtum, der zu Konfigurationen führt, die anders wirken als gedacht.

Zwei weitere Fallen: `Disallow:` ohne Wert bedeutet „alles erlaubt", nicht „nichts erlaubt". Und `Allow: /` ist bei fehlenden Disallow-Regeln redundant, schadet aber nicht und macht die Absicht lesbar – gerade das ist bei einer Datei, die mehrere Personen pflegen, ein Wert für sich.
