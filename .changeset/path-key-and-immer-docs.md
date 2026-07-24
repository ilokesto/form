---
"@ilokesto/form": patch
---

Document performance considerations for PathKey encoding and immer dependency.

- README.md/README.ko.md FormPath section: note that `JSON.stringify`/`JSON.parse` could be replaced with NUL-separator encoding for large forms; benchmark before migrating.
- README.md/README.ko.md FormStateWriter section: note that immer (~5KB) could be replaced with spread-based updates for flat record structure; benchmark before migrating.

No code changes — documentation of design decisions and future optimization paths.