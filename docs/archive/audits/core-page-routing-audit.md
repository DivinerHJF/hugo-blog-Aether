# Core Page Routing Audit

Date: 2026-05-10

Scope: only homepage, archive page, sampled post pages, categories page, tags page, page generation, and internal link accessibility.

## Local build

Command:

```bash
hugo --gc --minify
```

Result: passed. Hugo generated the core pages without fatal errors.

Known warnings observed during this scoped audit:

- `The author key in site configuration is deprecated. Use params.author.email instead.`
- `The author key in site configuration is deprecated. Use params.author.name instead.`

These warnings are outside this task's page-generation/internal-link scope.

## Local preview

Command:

```bash
hugo server -D --disableFastRender --bind 127.0.0.1 --port 1313
```

Result: passed. Local preview was available at `http://127.0.0.1:1313/`.

## Pages checked

| Page | HTTP status | Result |
| --- | ---: | --- |
| `/` | 200 | OK |
| `/posts/` | 200 | OK |
| `/2025/07/20250705/` | 200 | OK |
| `/2025/08/20250828/` | 200 | OK |
| `/2025/09/20250915/` | 200 | OK |
| `/categories/` | 200 | OK |
| `/tags/` | 200 | OK |

## 404 or error links

Initial scoped local-preview link check found these Vercel-only script paths returning 404 outside Vercel:

- `/_vercel/insights/script.js`
- `/_vercel/speed-insights/script.js`

Fix applied: render the Vercel analytics scripts only for production Hugo builds, so local preview does not emit Vercel-only internal script paths.

Final scoped local-preview link check found no 404 or internal link errors in the page sample above.
