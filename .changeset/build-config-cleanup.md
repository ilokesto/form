---
"@ilokesto/form": patch
---

Build config cleanup: enable sourcemaps, preserve JSDoc in declarations, remove dead vite build config, remove redundant .npmignore.

- `tsconfig.json`: `sourceMap: true` — consumers can now debug into library source.
- `tsconfig.json`: `removeComments: false` — Korean JSDoc preserved in `.d.ts` files, visible in IDE tooltips.
- `vite.config.ts`: removed dead `build.lib` block (production build uses `tsc`, not `vite build`). File now clearly scoped to vitest config only.
- Removed `.npmignore` — `package.json` `files` field already controls published files; `.npmignore` was redundant.