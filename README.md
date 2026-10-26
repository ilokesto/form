# @ilokesto/form

A framework-independent TypeScript form core for values, field metadata, validation, and submission.

[![npm](https://img.shields.io/npm/v/@ilokesto/form?style=flat&color=555)](https://www.npmjs.com/package/@ilokesto/form)
[![MIT](https://img.shields.io/badge/license-MIT-555?style=flat)](./LICENSE)

[Docs](./docs/index.mdx) | [API](./docs/reference/create-form.mdx) | [한국어](./README.ko.md)

- Manage nested fields with explicit tuple paths and normalized field state.
- Validate with Standard Schema v1, including field-local schemas and async results.
- Preserve array item metadata and connect React, Vue, Solid, or Svelte adapters.

## Installation

```sh
pnpm add @ilokesto/form
```

The package ships ESM and TypeScript declarations; CommonJS `require()` is not
supported. Use ESM imports or dynamic `import()`. Install your chosen framework
when using its adapter subpath.

## Quick start

Create a form, update a nested field, and submit its current values:

```ts
import { CreateForm } from '@ilokesto/form';

type LoginValues = {
  email: string;
  profile: {
    name: string;
  };
};

const form = new CreateForm<LoginValues>({
  defaultValues: {
    email: '',
    profile: {
      name: 'Ada',
    },
  },
});

form.setValue('email', 'ada@example.com', { source: 'user' });
form.setValue(['profile', 'name'], 'Grace', { source: 'user' });

console.log(form.getFieldState('email').dirty); // true
console.log(form.getValues().profile.name); // Grace

await form.submit(values => {
  console.log(values.email);
});
```

Strings are literal field names: `'profile.name'` and `['profile', 'name']`
refer to different fields. Treat `getState()` snapshots as read-only.
`dirty` compares against defaults; `modified` records user-sourced writes.

This example has no schema. Add a Standard Schema-compatible `schema` for
validation; automatic validation defaults to submit. `setValue()` returns `void`
and does not await change validation. Use `trigger()` for awaited validation.
Array `move()` and `swap()` retain item metadata; `replace()` intentionally drops it.

Adapters live at `/react`, `/vue`, `/solid`, and `/svelte`, keeping the root free
of framework and DOM imports. See their guides for lifecycle ownership and
external `values` synchronization.

## Further reading

- [Core concepts and field state](./docs/core-concepts.mdx)
- [Framework adapter API](./docs/reference/adapter-use-form.mdx)
- [Validation and field-local schemas](./docs/reference/validation.mdx)
- [Array keys and metadata rebasing](./docs/advanced/array-rebasing.mdx)
- [Core walkthrough, runtime flows, and framework guides](./docs/readme-reference.md)

<details>
<summary>Development</summary>

Use Node 24.22.1 and pnpm 10.17.1. Run these commands from this repository root:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test
pnpm test:pack
pnpm examples:build
pnpm examples:typecheck
pnpm test:tooling
pnpm migrate:verify
pnpm docs:publication:verify
pnpm docs:typecheck
pnpm docs:build
pnpm docs:test
```

Build output goes to `dist/`. `test:pack` checks an isolated consumer using registry
Store; the example commands check all five private examples. After building the
private documentation site, `pnpm docs:start` serves it locally.

Canonical bilingual content lives in `docs/`; `website/` owns the renderer.
Preserve immutable publication archives and migration history.

Pull requests run Verify CI. Main merges create or update a Changesets release PR; merging
that PR publishes only the exact successful Verify artifact through GitHub Actions. Enable
`Allow GitHub Actions to create and approve pull requests` and configure `NPM_TOKEN` in the
`Production` environment before rollout. Never publish locally or deploy documentation.

</details>
