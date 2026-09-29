---
name: Generated client compiler libs
description: The TypeScript library settings required by the generated React API client.
---

The generated Orval fetch client uses `Headers.entries()`, so the API client library compiler configuration must include both `dom` and `dom.iterable`.

**Why:** The workspace's generated client typecheck fails on `Headers.entries()` when only the base DOM library is included.

**How to apply:** Preserve `dom.iterable` whenever regenerating the API client or changing the shared TypeScript library settings.