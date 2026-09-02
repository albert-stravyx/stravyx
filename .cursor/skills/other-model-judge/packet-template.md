# Judge packet template

Write `.agent/packets/<task-id>-<role>.md` with these headings. Omit empty optional sections rather than inventing content. Do not embed secrets, `.env` values, tokens, or prompt bodies.

```markdown
# Judge packet

- Role:
- Task id:
- Objective:
- Acceptance criteria:
- Allowed paths:
- Forbidden paths:

## Approved artefacts (capped excerpts)

## Diff (allowed_paths only)

## Tests / gates

## Already-read snippets

## Uncertainties / files not in this packet
```

`scripts/build_judge_packet.py` fills this from `.agent/current-task.yaml` plus `git diff`. Cursor-model notes and test logs may be passed with `--notes` and `--tests-log`.
