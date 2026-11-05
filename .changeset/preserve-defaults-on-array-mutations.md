---
"@ilokesto/form": patch
---

Preserve configured default values during array insert, push, remove, move, swap,
and replace operations. Array changes no longer redefine the reset or dirty
baseline of unrelated edits, and reset restores the configured values and keys.
