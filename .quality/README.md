# Machine-enforced code quality policy

This directory contains repository quality policy that supplements compiler, linter, test, review and CI checks.

`policy.json` defines source scanning, prohibited type escapes, suppression rules, complexity/file-size thresholds and architecture boundaries. `exceptions.json` is the only supported waiver mechanism.

A waiver must be narrow, task-linked, owned, justified and time-bounded. Do not add a waiver merely to make CI pass. The reviewer must verify that the exception is genuinely unavoidable and that the `review_by` date is meaningful.

Run locally:

```bash
python scripts/code_quality_guard.py
python scripts/architecture_guard.py
```

The guards return diagnostics with a stable code, source location, reason and suggested corrective action so an engineer or agent can troubleshoot instead of guessing.
