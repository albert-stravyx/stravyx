# Dependency Policy

New production dependencies require approval. Prefer the language/runtime standard library or an existing dependency when it solves the problem cleanly. A proposal must state: problem, alternatives, maintenance/maturity, licence, security implications, runtime/bundle/operational cost, and removal/upgrade implications. Pin versions through the project package manager and commit lockfiles. Agents must not install a package merely to bypass an implementation or typing problem.
