# Engineering Metrics and Optimisation — current baseline

## Purpose

Measure whether the software-factory workflow improves accepted engineering outcomes without rewarding code volume or fabricated usage data.

## Canonical storage

Factory telemetry is local SQLite at `.agent/local/factory.db` (WAL mode). It records project/factory metadata such as task/run IDs, agent/model/profile/risk/complexity, latency, token/cost values when actually reported, success/retry/escalation and context/cache effectiveness. Raw prompts, source code, secrets and customer data are not stored by default.

Legacy `.agent/metrics/events.jsonl` references describe pre-v29 instrumentation and are not the current source of truth.

## Useful commands

```bash
./factory stats --days 30
./factory insights
./factory cost-attribution --days 30
./factory quality-dollar --days 30
./factory context-effectiveness --days 30
./factory factory-health-score
./factory project-health-score
```

## Interpretation

Prefer trends over single-task conclusions. Compare similar task classes. Optimize expected cost per accepted successful change subject to quality, risk, review and safety floors. Never estimate missing provider usage merely to fill a report, and never weaken tests/review/security to improve a metric.

## Remote sync

Only project-scoped, explicitly sync-eligible metadata may be remotely synchronized. Factory-template changes and local factory state are not project activity.
