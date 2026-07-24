# @ilokesto/form

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
