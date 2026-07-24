# @ilokesto/form

## 1.0.5

### Patch Changes

- 90950d7: Add Vue/Solid/Svelte login form examples and React validation flow example
- d1a6685: Add Biome linter/formatter with `lint`, `lint:fix`, and `format` scripts. Add CI lint step. Remove `.prettierrc` in favor of Biome configuration.
- d57581c: Build config cleanup: enable sourcemaps, preserve JSDoc in declarations, remove dead vite build config, remove redundant .npmignore.

  - `tsconfig.json`: `sourceMap: true` — consumers can now debug into library source.
  - `tsconfig.json`: `removeComments: false` — Korean JSDoc preserved in `.d.ts` files, visible in IDE tooltips.
  - `vite.config.ts`: removed dead `build.lib` block (production build uses `tsc`, not `vite build`). File now clearly scoped to vitest config only.
  - Removed `.npmignore` — `package.json` `files` field already controls published files; `.npmignore` was redundant.

- e71b915: Add dedicated unit tests for core modules.

  - `test/core/ValueHelper.test.ts` — covers path-based get/set and values reconstruction.
  - `test/core/FormPath.test.ts` — covers path ↔ key conversion and path normalization.
  - `test/core/FormStateInitializer.test.ts` — covers defaultValues → FormState initialization.
  - `test/core/FormArrayMutationPlanner.test.ts` — covers push, insert, remove, move, swap, and replace planning.
  - `test/core/FormArrayRebaser.test.ts` — covers field metadata rebase and arrayKeys updates.

- 3a22eab: Document ESM-only policy in README.

  The package is ESM-only (`"type": "module"`, no `require` condition in `exports`). This is now explicitly documented in the Installation section of README.md and README.ko.md, with guidance for CJS consumers (dynamic `import()` or bundler transpilation). No code changes — documentation only.

- 18bd869: Document performance considerations for PathKey encoding and immer dependency.

  - README.md/README.ko.md FormPath section: note that `JSON.stringify`/`JSON.parse` could be replaced with NUL-separator encoding for large forms; benchmark before migrating.
  - README.md/README.ko.md FormStateWriter section: note that immer (~5KB) could be replaced with spread-based updates for flat record structure; benchmark before migrating.

  No code changes — documentation of design decisions and future optimization paths.

- afd7fca: Add `useField` to the Svelte adapter for API parity with React/Vue/Solid.

  - `useForm(form).useField(options)` returns `{ props, value, setValue, errors, dirty, touched }` matching the shape of the React, Vue, and Solid `useField` hooks.
  - `props` is a Svelte `use:`-compatible register action bound to the field's `RegisterOptions`, so `<input use:field.props />` works directly.
  - `value`, `errors`, `dirty`, and `touched` read the latest field state from the core form on every access, staying reactive through the existing `form.subscribe` flow.
  - `setValue(value)` updates the field programmatically with `{ source: 'program' }`.
  - Field-local `schema` in `RegisterOptions` is supported via the existing register action, with cleanup on action destroy restoring the form-level schema.

  Resolves #17

## 1.0.4

### Patch Changes

- cf6399d: Guard async validation against race conditions via a generation counter.

  - `ValidationEngine` now increments an internal `validationGeneration` counter at the start of each validation cycle (`validateField`, `validateFields`, `validateRegisteredFields`).
  - After each `await` point, if a newer validation has started, the stale result is discarded and `applyErrors` is skipped — preventing stale async schema results from overwriting newer state.
  - This makes rapid typing with async (server-side) Standard Schema validators always reflect the most recent values, not whichever Promise happens to resolve last.
  - No behavior change for synchronous schemas; the guard is a no-op when nothing is in flight.

- db57c8a: Introduce Changesets for automated versioning and changelog management
- 3f7d849: Add `isFocused` to `FieldState` and implement `focus()` to track focus state.

  - `FieldState` gains a required `isFocused: boolean` field (default `false`).
  - `form.focus(path)` now sets `isFocused: true` on the target field instead of being a no-op.
  - `form.blur(path)` now clears `isFocused` (always, regardless of `validateOn`) in addition to marking the field as `touched` and running blur validation.
  - `FormArrayRebaser` carries `isFocused` across `move`, `swap`, `insert`, and `remove` so focus follows the moved item.
  - `FormStateSummary` gains `focusedField: string | null` exposing the path key of the currently focused field, or `null` when none is focused.
  - `reset()` clears `isFocused` to `false` for all fields (via factory default re-initialization).

- 5ee9c32: Add MIT LICENSE file and correct README's private/publishConfig statement

  - Add `LICENSE` file (MIT) to the repository root
  - Include `LICENSE`, `README.md`, `README.ko.md` in `package.json` `files` so the published tarball contains the license and docs
  - Fix incorrect README claim that the package is marked as private; the package is published with public access

  Resolves #4
  Resolves #5

- 55bc5c1: Add reactive `values`/`resetOptions` support to the Vue adapter.

  - New `VueFormOptions<TValues>` type with `values?: MaybeRefOrGetter<TValues>` and optional `resetOptions`.
  - `useForm` now accepts `VueFormOptions` in addition to a `Form` instance or `CreateFormOptions`.
  - When `values` is provided, the adapter calls `form.reset(values, resetOptions)` on first run and watches the reactive source for changes, mirroring the React adapter's behavior.
  - Vue `useFormState`/`UseFormStateReturn`/`VueFormStateReturn`/`SolidFormStateReturn` types now expose `focusedField: string | null` (carries over from #8 to adapter-level type definitions).
  - README (EN/KO) and docs/integrations/vue.{mdx,ko.mdx} document the new `values` option with examples.
