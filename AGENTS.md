# @ilokesto/form

This repository owns the Form library and its five private examples.

## Development

Use Node 24.22.1 and pnpm 10.17.1. Install with `pnpm install --frozen-lockfile`. Keep framework-neutral state in `src/core` and adapters in their framework directories. Use only exported Store APIs. Other libraries resolve from the registry, never sibling repositories.

Run `pnpm typecheck` for library code and `pnpm test` for the full aggregate: build once, `test:unit`, `test:tooling`, `test:pack`, and all five example build/type checks. Runtime and adapter tests live in `tests/unit`; fixtures and helpers live in `tests/fixtures`; Node tooling tests live in `tests/tooling`. Run `pnpm build` before standalone `pnpm test:pack`. The packed consumer must resolve registry Store without local overrides.

## Releases

Add a root Changeset for consumer-facing changes. Pull requests run Verify CI. Main merges create or update a Changesets release PR; merging that PR publishes only the exact successful Verify artifact through GitHub Actions. Enable `Allow GitHub Actions to create and approve pull requests` and configure `NPM_TOKEN` in the `Production` environment before rollout. Never publish locally.
