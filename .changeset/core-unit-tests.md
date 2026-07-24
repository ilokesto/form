---
"@ilokesto/form": patch
---

Add dedicated unit tests for core modules.

- `test/core/ValueHelper.test.ts` — covers path-based get/set and values reconstruction.
- `test/core/FormPath.test.ts` — covers path ↔ key conversion and path normalization.
- `test/core/FormStateInitializer.test.ts` — covers defaultValues → FormState initialization.
- `test/core/FormArrayMutationPlanner.test.ts` — covers push, insert, remove, move, swap, and replace planning.
- `test/core/FormArrayRebaser.test.ts` — covers field metadata rebase and arrayKeys updates.
