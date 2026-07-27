# Agent Skills by Lars Decker

**English** · [Deutsch](README.de.md)

Skills for coding agents that sit where product work meets engineering. All of them produce evidence from measurable signals — no gut-feel assessments, no invented numbers, and in every skill an explicit list of what it **cannot** do.

Most published skills help you write code. These help with decisions **about** code: prioritisation, justification, discoverability.

> **Note on language:** the `SKILL.md` files and reference documents are written in **German**. The scripts, their output and all CLI options are language-neutral, and the agent will answer you in whatever language you use. But if you want to read or adapt the instructions themselves, expect German. See [Language](#language).

| Skill | What it does |
| :-- | :-- |
| **tech-debt-ledger** | Turns a Git repository into a tech-debt register written in stakeholder language: hotspots from churn × size, change coupling, knowledge risk, test gaps — translated into risk and the smallest effective countermeasure. |
| **seo-check** | Audits a website against a rule set with concrete thresholds: title, description, canonical, robots directives, headings, robots.txt, sitemap, rendering, status codes, images, links, hreflang, Open Graph, JSON-LD. |
| **seo-fix** | Implements those findings in the codebase — framework-aware, ordered by impact, with a verification pass. Draws a hard line between mechanical fixes and editorial decisions. |
| **geo-audit** | Checks whether a site can appear in AI answer engines: retrieval crawler access, llms.txt, entity clarity via JSON-LD, quotability at paragraph level — with a concrete fix list. |

`seo-check` and `geo-audit` share the topic of discoverability without overlapping: classic search with a result list → `seo-check`. A composed answer with cited sources → `geo-audit`. Neither checks what the other checks, so they can't produce contradictory advice.

## Agent-agnostic by design

A skill here is nothing more than a `SKILL.md`: Markdown with YAML front matter, next to it reference documents and dependency-free Node scripts. None of it is tied to a vendor.

What differs between agents is only **where they look for instructions**. That is exactly what `install.mjs` handles: it places the skill files under `.agents/skills/<name>/` and writes an entry point wherever your agent expects to find one.

```bash
git clone https://github.com/larsdecker/agents-skills
cd agents-skills
node install.mjs --list
```

Then install into your project:

```bash
node /path/to/agents-skills/install.mjs --agent cursor --target .
```

| `--agent` | Agent | What gets written |
| :-- | :-- | :-- |
| `claude` | Claude Code | `.claude/skills/<name>/` (native, no pointer needed) |
| `cursor` | Cursor | `.cursor/rules/<name>.mdc` |
| `copilot` | GitHub Copilot | `.github/instructions/<name>.instructions.md` |
| `windsurf` | Windsurf | `.windsurf/rules/<name>.md` |
| `cline` | Cline / Roo Code | `.clinerules/<name>.md` |
| `agents` | Codex, Zed, Amp, opencode, Jules, Factory … | a section in `AGENTS.md` |
| `gemini` | Gemini CLI | a section in `GEMINI.md` |

Further options: `--skill <name>` for a single skill, `--dry-run` to preview.

The sections in `AGENTS.md` and `GEMINI.md` are delimited by markers: running the installer again replaces them instead of duplicating them, and any existing content in those files is left untouched.

**Your agent isn't listed?** Copy the skill directory anywhere and point to it from your agent's instruction file. That's all it takes — the skills contain no agent-specific code.

**No agent at all:** both scan scripts are ordinary Node programs (Node ≥ 18, zero dependencies) and run standalone. The agent interprets the results; it does not produce them.

```bash
node skills/tech-debt-ledger/scripts/scan-repo.mjs --since 12m --json
```

```bash
node skills/seo-check/scripts/seo-scan.mjs --site https://example.com --max-pages 5
```

```bash
node skills/geo-audit/scripts/geo-scan.mjs --site https://example.com --max-pages 5
```

### Claude Code as a plugin

In Claude Code there is also the plugin marketplace route, which hands installation and updates to Claude Code:

```bash
/plugin marketplace add larsdecker/agents-skills
```

```bash
/plugin install seo-check@lars-decker
```

`/reload-plugins` activates it in the running session. Claude also loads these skills on its own when a topic matches — you don't have to invoke them by name.

## tech-debt-ledger

**The problem:** developers can see technical debt but can't translate it into budget. Product owners have to prioritise it but can't spot it themselves. Both sides discuss the same thing and mean different things.

**What the skill does:** it combines change frequency with size. The core is a simple distinction with large consequences — a big file nobody touches costs nothing. A big file changed every week charges its surcharge again on every requirement. Only the second belongs in a register.

Signals collected:

- **Hotspots** — churn × size, normalised against the maximum in the window
- **Change coupling** — files repeatedly changed together despite living in separate modules; the best available hint at a missing abstraction
- **Knowledge risk** — high churn with a single author (suppressed in solo repositories, where it isn't a finding but a property of the project)
- **Test gaps** — hotspots without a matching test file; if there is no test infrastructure at all, that becomes one structural entry instead of a list
- **Dead code** — untouched and unreferenced, with a filter for convention-loaded entry points such as `page.tsx` or `*.config.js`

The output is a `TECH-DEBT.md` that is carried forward on each run: existing entries are updated, resolved ones move into a "Resolved" section with a date. The real value shows up on the second run, when a trend becomes visible instead of a snapshot.

**What it deliberately does not do:** no effort estimates in person-days (only the team can do that), no static analysis (ESLint and Sonar exist), no security review.

## seo-check and seo-fix

Two skills for one area with a clear division of labour: `seo-check` finds and assesses, `seo-fix` implements. Separate, because finding and changing need different permissions and different caution — an audit can run any time, a change to production redirects cannot.

**The rule set is explicit and open:** thresholds for title width and length, description limits for desktop and mobile, canonical error conditions, valid robots directives and their precedence, robots.txt group isolation, sitemap limits, status-code handling, image sizes and attributes, hreflang code formats, Open Graph image dimensions, and required properties per schema type. Every value lives in the `LIMITS` object at the top of the scan script and in `references/rules.md` — with a rationale and, more importantly, a statement of **when a rule does not apply**.

What sets these apart from a generic SEO tool:

- **Impact order instead of checklist length.** Five stages from indexability to polish. A perfect title on a `noindex` page is worthless, so the stages are never worked in parallel.
- **Readability measured per language.** German pages use the Amstad variant of the Flesch formula, not the English one. The widely quoted 60–70 target range is calibrated for English; German technical prose sits structurally below it, and flagging that leads to worse writing. Overview and legal pages are not measured at all.
- **Template versus single page.** Every finding is classified by whether it affects one page or a template — the difference between five minutes and five days of work.
- **No score.** An "SEO score 78/100" implies a precision that does not exist and distracts from the only question that matters: which two things to do first.
- **Hard limits in `seo-fix`.** No removing `noindex` without asking, no markup for content that isn't visible on the page, no invented ratings, no `alt` text for images the agent hasn't seen, no `dateModified` taken from the deployment timestamp. The first three are guideline violations that risk a manual action; the last two silently devalue signals.

**Not measurable and therefore explicitly declared:** Core Web Vitals (need a real browser or field data — the scan only reports the known triggers), match with search intent, content depth, cross-domain duplicate content.

## geo-audit

**The problem:** answer engines quote paragraphs, not pages. Classic SEO tools don't measure that, because they optimise for ranking rather than for whether a single statement can be lifted out and reused.

**What the skill does:**

- **Crawler access** with the distinction almost everyone misses: retrieval versus training. Blocking `GPTBot` costs no visibility in answers; blocking `OAI-SearchBot` does. A blocked training bot is therefore reported as an observation, not an error.
- **Entity clarity** — JSON-LD for `Person`/`Organization`, `@id` linkage across pages, `sameAs` anchors. For individuals and small companies this is the strongest lever available, because it establishes authority that would otherwise only come from being well known.
- **Quotability** — the share of sentences that open with a back-reference and are useless out of context; sentence length; whether the answer precedes the reasoning. Prose criteria are applied to article pages only: on overview pages, teaser fragments merge into pseudo-sentences and distort every measurement.
- **Structure** — questions as headings, extractable lists and tables, clean hierarchy
- **llms.txt** — presence and shape, including detection of the most common failure: a single-page app serving HTML with status 200 for `/llms.txt`, which means the file effectively doesn't exist

The script issues GET requests only, waits between pages, and identifies itself with its own user agent.

**What it deliberately does not do:** no measurement of actual visibility. Whether a model cites you depends on training data, index state and competition for the specific question — none of which is observable from outside. The audit checks preconditions, not outcomes. Anyone promising a guarantee is selling something else.

## Repository layout

```
skills/                              agent-neutral source of truth
├── tech-debt-ledger/
│   ├── SKILL.md                     workflow and rules
│   ├── references/                  taxonomy, stakeholder language, template
│   ├── scripts/scan-repo.mjs        signal collection, dependency-free
│   └── .claude-plugin/plugin.json   metadata for Claude Code
├── seo-check/
│   ├── SKILL.md
│   ├── references/                  rule set, status codes, schema requirements
│   └── scripts/seo-scan.mjs
├── seo-fix/
│   ├── SKILL.md
│   └── references/                  impact order, framework patterns, copy rules
└── geo-audit/
    ├── SKILL.md
    ├── references/                  criteria, crawlers, llms.txt, fix patterns
    └── scripts/geo-scan.mjs

install.mjs                          per-agent installation
.claude-plugin/marketplace.json      marketplace catalogue for Claude Code
```

`skills/<name>/` is the single source. There are no agent-specific copies that could drift apart — entry points are generated at install time and point back to these files.

## Language

The skill instructions and reference documents are in German. That is a deliberate limitation rather than an oversight: these skills encode judgement calls, and translating them properly means re-deciding wording that carries meaning — for example how a finding is phrased so that a stakeholder can act on it.

What works regardless of language:

- All scripts, CLI options and their output structure
- The rule sets and thresholds, which are numeric
- The agent's own replies, which follow the language you write in

If you want an English translation of the instructions, open an issue — it is a realistic contribution and a good first one.

## Background

Written up in more detail (in German):

- [Making technical debt visible](https://lars-decker.eu/blog/tech-debt-sichtbar-machen)
- [SEO is no longer enough: GEO](https://lars-decker.eu/blog/seo-ist-nicht-mehr-genug-geo)
- [How I use AI skills to simplify product owner work](https://lars-decker.eu/blog/ki-skills-fuer-product-owner)

Overview and details: [lars-decker.eu/skills](https://lars-decker.eu/skills)

## Feedback

Issues and pull requests are welcome. Especially valuable: cases where a scan produces a false positive. Both scanning skills live on having their heuristics sharpened against real repositories and real sites — one reported false finding improves them more than one new check.

Adding an adapter for another agent is a small change: one entry in the `AGENTS` object in `install.mjs`.

## Licence

MIT
