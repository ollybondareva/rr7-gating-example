import type { MiddlewareFunction } from "react-router";
import { capabilitiesStore } from "../capabilities/store";
import { capabilitiesContext, userContext } from "../context";

/**
 * Root middleware #2: loads roles + flags + org settings through the store
 * (in parallel, cached) before any loader runs, and puts that snapshot in the
 * router context. Gates and loaders in this navigation all see the same values.
 *
 * To refresh: `capabilitiesStore.invalidate()`. main.tsx then calls `router.revalidate()`.
 */
export const capabilitiesMiddleware: MiddlewareFunction = async ({
  context,
}) => {
  const user = context.get(userContext);
  if (!user)
    throw new Error("capabilitiesMiddleware must run after authMiddleware");

  context.set(capabilitiesContext, await capabilitiesStore.ensure(user));
};
