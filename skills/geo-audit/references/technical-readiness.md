# Technical Readiness

Technical readiness asks whether a provider can discover and retrieve useful content. It does not predict citation selection.

## Eligibility and access

Inspect HTTP status and final URL, redirect behavior, `robots.txt`, page-level `meta name="robots"`, `X-Robots-Tag`, `noindex`, canonical targets, and relevant restrictions such as snippet controls. Check both Googlebot/Bingbot and the retrieval agents relevant to the requested platforms. Training agents are a separate policy choice; their exclusion is not automatically a retrieval issue.

An allowed robots rule only indicates the site's published crawl policy. It does not prove the request succeeds. Check the actual response and, where possible, server/CDN/WAF logs. A generic scanner user agent cannot impersonate or verify the provider's real crawler identity.

## Discovery and retrieval

Check whether a sitemap is reachable, current, and referenced where appropriate. Inspect internal links to important pages. A sitemap is useful discovery infrastructure, not a guarantee of indexing or citation.

Check whether the key answer and supporting details exist in the initial HTML. Note content rendered only after JavaScript, interaction, authentication, or a delayed API call. Inspect accordions in source; do not assume hidden content is unavailable or available without checking. Product facts embedded only in images and inaccessible links to important pages deserve review.

Use observed response data. Do not infer a WAF block from robots.txt, and do not label missing structured data a technical blocker without provider-specific evidence.

## Finding priority

- **BLOCKER**: observed restriction or failure that prevents retrieval/indexing for the requested surface.
- **HIGH IMPACT**: substantial discovery or content availability limitation with a clear path to affect the target use case.
- **OPPORTUNITY**: useful improvement without evidence of a current hard restriction.
- **MONITOR**: no immediate action; track changing or incomplete evidence.
- **EXPERIMENTAL**: unverified convention or practice.

Do not infer that an issue prevents all visibility where only one provider, route, or crawler was checked.
