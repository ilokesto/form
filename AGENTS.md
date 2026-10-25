# @ilokesto/form

This repository owns the Form library, its five private examples, and its bilingual local documentation website.

## Development

Use Node 22 and pnpm 10.17.1. Install with `pnpm install --frozen-lockfile`. Keep framework-neutral state in `src/core` and adapters in their framework directories. Use only exported Store APIs. Other libraries resolve from the registry, never sibling repositories.

Run `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm test:pack`, `pnpm examples:build`, and `pnpm examples:typecheck`. The packed consumer must resolve registry Store without local overrides. Run `pnpm test:tooling` and `pnpm migrate:verify` after tooling changes.

## Documentation and releases

Canonical content lives in `docs`; `website` owns the renderer and assets. Preserve released snapshots, receipts, original archive refs and runtime identities. Run `docs:publication:verify`, `docs:typecheck`, `docs:build` and `docs:test`. Check English/Korean released/next pages and Form submission in a real browser.

Add a root Changeset for consumer-facing changes. Pull requests run Verify CI. Main merges create or update a Changesets release PR; merging that PR publishes only the exact successful Verify artifact through GitHub Actions. Enable `Allow GitHub Actions to create and approve pull requests` and configure `NPM_TOKEN` in the `Production` environment before rollout. Never publish locally or deploy documentation.
