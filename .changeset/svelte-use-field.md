---
"@ilokesto/form": patch
---

Add `useField` to the Svelte adapter for API parity with React/Vue/Solid.

- `useForm(form).useField(options)` returns `{ props, value, setValue, errors, dirty, touched }` matching the shape of the React, Vue, and Solid `useField` hooks.
- `props` is a Svelte `use:`-compatible register action bound to the field's `RegisterOptions`, so `<input use:field.props />` works directly.
- `value`, `errors`, `dirty`, and `touched` read the latest field state from the core form on every access, staying reactive through the existing `form.subscribe` flow.
- `setValue(value)` updates the field programmatically with `{ source: 'program' }`.
- Field-local `schema` in `RegisterOptions` is supported via the existing register action, with cleanup on action destroy restoring the form-level schema.

Resolves #17