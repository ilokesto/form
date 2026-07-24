---
"@ilokesto/form": patch
---

Document ESM-only policy in README.

The package is ESM-only (`"type": "module"`, no `require` condition in `exports`). This is now explicitly documented in the Installation section of README.md and README.ko.md, with guidance for CJS consumers (dynamic `import()` or bundler transpilation). No code changes — documentation only.