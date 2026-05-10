# Hugo Build Baseline

Date: 2026-05-10

## Scope

This baseline records module 1 of `docs/codex-audit-workflow.md`: local Hugo build status and core generated outputs. No theme structure, resources, or content files were changed.

## Environment

- Git branch: `work`
- Initial Git status: clean
- Local Hugo version: `hugo v0.123.7-312735366b20d64bd61bff8627f593749f86c964+extended linux/amd64 BuildDate=2024-03-01T16:16:06Z VendorInfo=gohugoio`
- Vercel pinned Hugo version: `0.123.7`
- Build command: `hugo --gc --minify`

## Build Result

`hugo --gc --minify` completed successfully with exit code 0.

Build summary:

- Pages: 222
- Paginator pages: 0
- Non-page files: 0
- Static files: 84
- Processed images: 0
- Aliases: 56
- Cleaned: 0

Warnings observed:

- `The author key in site configuration is deprecated. Use params.author.email instead.`
- `The author key in site configuration is deprecated. Use params.author.name instead.`

These warnings do not block the build and were not changed in this module.

## Core Generated Outputs

The following required files were generated under `public/`:

- `public/index.html`
- `public/index.xml`
- `public/sitemap.xml`
- `public/robots.txt`
- `public/index.json`

## Baseline Decision

No blocking build failures were found. No source, theme, resource, or content fixes were required for module 1.
