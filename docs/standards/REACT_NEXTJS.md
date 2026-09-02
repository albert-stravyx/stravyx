# React / Next.js standard

- Server Components by default; add `use client` only when browser interactivity actually requires it.
- Keep business rules outside components. Components render state and emit intents; application/domain services decide business facts.
- Do not fetch in `useEffect` when server data loading or an established query/application pattern is more appropriate.
- Avoid duplicated client/server schemas: share or generate contracts where practical.
- Every asynchronous UI has deliberate loading, empty, error and retry states.
- Use semantic HTML first; ARIA supplements semantics rather than replacing them.
- Do not make voice the only interaction path.
- Reuse design-system primitives and tokens before creating one-off variants.
