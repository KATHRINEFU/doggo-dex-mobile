---
name: Durable account deletion
description: Safety rule for deleting accounts while asynchronous jobs and concurrent API writes may still be running.
---

Account deletion must establish a durable, cross-process suppression record before removing user data. Every per-user write, including background-job completion, must serialize against that record and refuse to persist after deletion starts. Generated objects must use a deterministic user-owned namespace so cleanup can find every version.

**Why:** A process-local flag cannot coordinate replicas or survive restarts, and an asynchronous image job can otherwise upload or rewrite database state after the deletion request reports success. Unscoped random object names also make superseded files impossible to attribute later.

**How to apply:** Use this rule for any new profile mutation, aggregate sync, generated asset, or background worker that stores data by user. Account deletion should own external identity deletion server-side and remain safe to retry after partial failure.