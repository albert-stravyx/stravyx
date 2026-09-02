# Context engineering and agent hand-offs

Agents receive the smallest approved context package needed for the current decision.

## Include
Approved requirements/decisions, relevant repository instructions, target files/direct dependencies, exact acceptance assertions, known constraints/rejected approaches, and current tool evidence.

## Exclude or summarise
Superseded plans, unrelated repository content, stale logs, generated output, historical conversation and repeated evidence already captured in an artefact.

## Required hand-off
Every substantive agent hand-off must contain:
- approved decisions relied upon;
- completed slice(s);
- current behaviour and evidence;
- files changed or inspected;
- open risks;
- rejected approaches;
- next bounded task;
- required context files;
- stop conditions.

## Restart a child session when
It repeatedly defends a rejected approach; the context contains multiple superseded plans; it confuses files/environments/requirements; it becomes agreeable without evidence; or a critical recommendation requires independent re-checking.
