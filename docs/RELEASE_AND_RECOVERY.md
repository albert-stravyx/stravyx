# Release, Migration and Recovery

Consequential features should support a simple feature flag where useful. High-risk completion reports must include rollout, rollback, recovery and observability. Database migrations require forward/backward compatibility assessment, backup/recovery considerations, and a plan for partial rollout. Destructive migrations require explicit human approval and should prefer expand/migrate/contract sequencing. Engineering COMPLETE never implies production deployment.
