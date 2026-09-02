# Error handling standard

An error must help troubleshooting without leaking sensitive data. Prefer an error/result shape containing a stable code, concise detail, correlation identifier, retryability, safe context and a suggested next action.

Expected business outcomes should be represented explicitly (for example a discriminated result such as `success | unavailable`) rather than overloaded through exceptions or `null`. Unexpected failures should retain the original cause at the operational boundary.

Returning `null`/`None`, zero, an empty collection or a success response after an unexpected failure is prohibited because it changes a failure into apparently valid state.
