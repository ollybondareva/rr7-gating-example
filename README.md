# React Router 7.9.5 — data mode + middleware capability gating

```
npm run dev        # open the app, flip role/flags/org in the dev panel
npm run verify     # 21 gating scenarios against the real route tree
npm run build      # typecheck + vite build
```

## The pattern

```
authMiddleware ─► capabilitiesMiddleware ─► requires(policy) ─► loaders/action
 (session)        roles+flags+org, parallel,  per-route gate,     read context.get(...)
                  cached, → context           inherited by children
```

| Source        | Typical question             | Failure → outcome         |
|---------------|------------------------------|---------------------------|
| Feature flag  | Does this feature exist?     | **404** (hide existence)  |
| Org setting   | Has the org enabled or paid for it? | **redirect /upgrade** |
| User role     | Is this user allowed?        | **403**                   |

- `src/capabilities/policy.ts` holds one `Requirement` shape and a pure `check()`, plus named `policies`.
  Routes (`requires(policies.admin)`) and UI (`<Can req={policies.admin}>`) use the same object,
  so they can't drift apart.
- `src/capabilities/store.ts` is the **single source of truth**, and it doesn't import React.
  `ensure(user)` loads once (in parallel, shared between concurrent callers), `get()` reads synchronously,
  `subscribe()` notifies listeners, and `invalidate()` clears it.

## Where capabilities are read

| Where | How |
|---|---|
| Route gates & loaders | `context.get(capabilitiesContext)`: one snapshot per navigation, set by middleware from `store.ensure()` |
| Components | `useCapabilities()` / `<Can>`: `useSyncExternalStore` on the store, falling back to the `app` loader data |
| Outside React | `canNow(policies.x)` / `capabilitiesStore.get()`. See `src/api/client.ts` |

Refresh from anywhere: `capabilitiesStore.invalidate()`. `main.tsx` subscribes and calls
`router.revalidate()`, so middleware re-runs and the current page is checked again.
- `src/context.ts` has a `declare module "react-router" { interface Future { v8_middleware: true } }`.
  In data mode it's **types only** (no runtime flag): it makes loader `context` a typed `RouterContextProvider`.

## Gotchas
- **Where errors render:** a middleware throw bubbles from the *shallower* of the throwing route and the
  shallowest route that has to load data. If no route loads data, it bubbles from the **root**.
  So give the middleware-owning route an `ErrorBoundary` that doesn't depend on loader data, and give gated routes a loader.
- Middleware runs before **actions** too, so mutations are gated.
- Client gating is UX only. Your API must enforce the same rules.
