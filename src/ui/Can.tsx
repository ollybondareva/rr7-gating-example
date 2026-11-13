import { useSyncExternalStore, type ReactNode } from "react";
import { useRouteLoaderData } from "react-router";
import { can, type Requirement } from "../capabilities/policy";
import { capabilitiesStore } from "../capabilities/store";
import type { Capabilities } from "../capabilities/types";

/**
 * Live capabilities from the store. While a refresh is running (snapshot is null),
 * it falls back to the values the "app" route's loader returned for this navigation.
 */
export function useCapabilities(): Capabilities {
  const live = useSyncExternalStore(capabilitiesStore.subscribe, capabilitiesStore.get);
  const fromLoader = useRouteLoaderData("app") as Capabilities | undefined;
  const caps = live ?? fromLoader;
  if (!caps) throw new Error("useCapabilities must be used under the 'app' route");
  return caps;
}

export function useCan(req: Requirement): boolean {
  return can(useCapabilities(), req);
}

/**
 * UI-level gating (hide links/buttons). It calls the SAME `check()` as the route
 * middleware, so a visible link never leads to a 403.
 */
export function Can({
  req,
  children,
  fallback = null,
}: {
  req: Requirement;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return <>{useCan(req) ? children : fallback}</>;
}
