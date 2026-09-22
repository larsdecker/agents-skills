# Entity Clarity and Trust

Determine whether readers and systems can identify the publisher, authors, and basis for expertise. Treat structured data as supporting context, not proof of authority or a visibility requirement.

Review visible author and organization names, biographies, qualifications, contact/about information, consistency across pages, linked profiles, citations, editorial or testing methodology, dates, versions, and disclosed limitations.

Where JSON-LD exists, inspect validity and whether its claims match visible content. Stable `@id` relationships and relevant `Person` or `Organization` entities can help connect information. `sameAs` should point only to genuine profiles of the same entity. Do not recommend schema for invisible or untrue claims, and do not treat absence of JSON-LD or FAQ markup as a GEO blocker.

Assess evidence by what can be verified:

- **Strong**: specific original data, methods, samples, versions, and limitations are reported.
- **Limited**: relevant experience or testing is described but key details are missing.
- **Commodity**: broad claims repeat common information without distinctive evidence.

These are descriptive categories, not a numeric authority score.
