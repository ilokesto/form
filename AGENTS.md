# @ilokesto/form

This repository owns the Form library and its five private examples.

## Development

Use Node 24.22.1 and pnpm 10.17.1. Install with `pnpm install --frozen-lockfile`. Keep framework-neutral state in `src/core` and adapters in their framework directories. Use only exported Store APIs. Other libraries resolve from the registry, never sibling repositories.

Run `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm test:pack`, `pnpm examples:build`, and `pnpm examples:typecheck`. The packed consumer must resolve registry Store without local overrides. Run `pnpm test:tooling` after tooling changes.

## Releases

Add a root Changeset for consumer-facing changes. Pull requests run Verify CI. Main merges create or update a Changesets release PR; merging that PR publishes only the exact successful Verify artifact through GitHub Actions. Enable `Allow GitHub Actions to create and approve pull requests` and configure `NPM_TOKEN` in the `Production` environment before rollout. Never publish locally.
