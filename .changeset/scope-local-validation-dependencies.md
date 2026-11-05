---
"@ilokesto/form": patch
---

Keep pending local-only field validation when unrelated values or array entries
change. Track the target's value dependencies and relevant stable array item keys,
while preserving whole-form dependencies for fallback and submission validation.
Reset now invalidates pending validation even when its values are unchanged.
