# Naming and structure standard

Names should communicate domain intent rather than implementation mechanics. Prefer `calculate_availability` over `process_data`, `ReservationConflict` over `BadRequestError`, and `CatalogueRepository` over generic `Manager`/`Helper` classes.

Modules should have one coherent reason to change. Avoid catch-all `utils`, `helpers`, `common` and `manager` modules unless the repository already defines a narrow, stable purpose for them. Public contracts belong close to the boundary/domain they describe. Tests mirror the behaviour/module they verify.

Use consistent vocabulary from the product brief and domain model. Do not introduce synonyms for established concepts merely because an AI model prefers different wording.
