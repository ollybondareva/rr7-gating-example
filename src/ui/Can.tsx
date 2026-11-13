import type { ReactNode } from "react";
import { useRouteLoaderData } from "react-router";
import { can, type Requirement } from "../capabilities/policy";
import type { Capabilities } from "../capabilities/types";

/** Capabilities resolved by the "app" route's middleware and returned by its loader. */
export function useCapabilities(): Capabilities {
  const caps = useRouteLoaderData("app") as Capabilities | undefined;
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
