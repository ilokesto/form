---
"@ilokesto/form": patch
---

Guard async validation against race conditions via a generation counter.

- `ValidationEngine` now increments an internal `validationGeneration` counter at the start of each validation cycle (`validateField`, `validateFields`, `validateRegisteredFields`).
- After each `await` point, if a newer validation has started, the stale result is discarded and `applyErrors` is skipped — preventing stale async schema results from overwriting newer state.
- This makes rapid typing with async (server-side) Standard Schema validators always reflect the most recent values, not whichever Promise happens to resolve last.
- No behavior change for synchronous schemas; the guard is a no-op when nothing is in flight.