import type { MiddlewareFunction } from "react-router";
import { fetchFlags, fetchOrgSettings, fetchRoles } from "../api/mock";
import type { Capabilities } from "../capabilities/types";
import { capabilitiesContext, userContext } from "../context";

/**
 * Root middleware #2: fetch roles + flags + org settings in PARALLEL, once,
 * before any loader runs. Child middleware and loaders read the result from context.
 *
 * Client middleware runs on every navigation, so we cache. Call
 * `invalidateCapabilities()` when something changes (role change, org
 * settings saved, logout, flag-service push) and then `router.revalidate()`.
 */
let cache: { key: string; at: number; value: Promise<Capabilities> } | null =
  null;
const TTL_MS = 60_000;

export function invalidateCapabilities() {
  cache = null;
}

export const capabilitiesMiddleware: MiddlewareFunction = async ({
  context,
}) => {
  debugger;
  const user = context.get(userContext);
  if (!user)
    throw new Error("capabilitiesMiddleware must run after authMiddleware");

  const key = `${user.id}:${user.orgId}`;
  if (!cache || cache.key !== key || Date.now() - cache.at > TTL_MS) {
    // Cache the promise itself, so concurrent navigations/fetchers share one request.
    const value = Promise.all([
      fetchRoles(user.id),
      fetchFlags(user.id, user.orgId),
      fetchOrgSettings(user.orgId),
    ]).then(([roles, flags, org]) => ({ user, roles, flags, org }));
    cache = { key, at: Date.now(), value };
    value.catch(() => (cache = null)); // don't cache failures
  }

  context.set(capabilitiesContext, await cache.value);
};
