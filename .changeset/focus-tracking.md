---
"@ilokesto/form": patch
---

Add `isFocused` to `FieldState` and implement `focus()` to track focus state.

- `FieldState` gains a required `isFocused: boolean` field (default `false`).
- `form.focus(path)` now sets `isFocused: true` on the target field instead of being a no-op.
- `form.blur(path)` now clears `isFocused` (always, regardless of `validateOn`) in addition to marking the field as `touched` and running blur validation.
- `FormArrayRebaser` carries `isFocused` across `move`, `swap`, `insert`, and `remove` so focus follows the moved item.
- `FormStateSummary` gains `focusedField: string | null` exposing the path key of the currently focused field, or `null` when none is focused.
- `reset()` clears `isFocused` to `false` for all fields (via factory default re-initialization).