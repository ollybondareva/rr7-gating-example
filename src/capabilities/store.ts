// Single source of truth for capabilities. No React imports, so it works anywhere:
// router middleware, components (via useSyncExternalStore), API clients, sockets, plain modules.
import { fetchFlags, fetchOrgSettings, fetchRoles } from "../api/mock";
import { can, type Requirement } from "./policy";
import type { Capabilities, User } from "./types";

let snapshot: Capabilities | null = null;
let inflight: { key: string; promise: Promise<Capabilities> } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const keyOf = (u: User) => `${u.id}:${u.orgId}`;

export const capabilitiesStore = {
  /** Sync read. It's null before the first load and right after invalidate(). */
  get(): Capabilities | null {
    return snapshot;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Async read: returns the cached snapshot for this user/org, or loads it once (concurrent calls share the request). */
  ensure(user: User): Promise<Capabilities> {
    const key = keyOf(user);
    if (snapshot && keyOf(snapshot.user) === key) return Promise.resolve(snapshot);
    if (inflight?.key === key) return inflight.promise;

    const promise = Promise.all([
      fetchRoles(user.id),
      fetchFlags(user.id, user.orgId),
      fetchOrgSettings(user.orgId),
    ])
      .then(([roles, flags, org]) => {
        // Ignore the result if invalidate() or another user's load happened meanwhile.
        if (inflight?.promise === promise) {
          snapshot = { user, roles, flags, org };
          emit();
        }
        return { user, roles, flags, org };
      })
      .finally(() => {
        if (inflight?.promise === promise) inflight = null;
      });
    inflight = { key, promise };
    return promise;
  },

  /** Drop the cached values. Subscribers are told (main.tsx revalidates the router). */
  invalidate(): void {
    snapshot = null;
    inflight = null;
    emit();
  },
};

/** Non-React check. Returns false when the store hasn't loaded yet. */
export function canNow(req: Requirement): boolean {
  const caps = capabilitiesStore.get();
  return caps ? can(caps, req) : false;
}
