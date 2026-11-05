---
"@ilokesto/form": patch
---

Pass reconstructed current values to local schemas for array, object, and root
paths. Reconstruct values once per local validation batch, preserving explicit
undefined values, missing paths, and metadata-only field ownership.
