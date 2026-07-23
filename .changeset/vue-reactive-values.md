---
"@ilokesto/form": patch
---

Add reactive `values`/`resetOptions` support to the Vue adapter.

- New `VueFormOptions<TValues>` type with `values?: MaybeRefOrGetter<TValues>` and optional `resetOptions`.
- `useForm` now accepts `VueFormOptions` in addition to a `Form` instance or `CreateFormOptions`.
- When `values` is provided, the adapter calls `form.reset(values, resetOptions)` on first run and watches the reactive source for changes, mirroring the React adapter's behavior.
- Vue `useFormState`/`UseFormStateReturn`/`VueFormStateReturn`/`SolidFormStateReturn` types now expose `focusedField: string | null` (carries over from #8 to adapter-level type definitions).
- README (EN/KO) and docs/integrations/vue.{mdx,ko.mdx} document the new `values` option with examples.