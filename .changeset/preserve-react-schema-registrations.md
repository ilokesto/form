---
"@ilokesto/form": patch
---

Keep React field schema registrations stable across ordinary rerenders, equivalent
tuple paths, and registration list changes that leave a field unchanged. Replace
registrations only when their schema or schema options change, and clean them up
when paths, forms, or mounted owners change.
