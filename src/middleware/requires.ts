import { data, redirect, type MiddlewareFunction } from "react-router";
import { check, type DenyReason, type Requirement } from "../capabilities/policy";
import { capabilitiesContext } from "../context";

export interface RequiresOptions {
  /** Override what happens per deny reason. */
  onDeny?: Partial<Record<DenyReason, () => never>>;
}

const defaults: Record<DenyReason, () => never> = {
  // A flagged-off feature acts as if it doesn't exist.
  flag: () => {
    throw data({ message: "Not found" }, { status: 404 });
  },
  // An org-level limit can be lifted, so send the user to the upsell.
  org: () => {
    throw redirect("/upgrade");
  },
  role: () => {
    throw data({ message: "You don't have access to this page." }, { status: 403 });
  },
  custom: () => {
    throw data({ message: "Forbidden" }, { status: 403 });
  },
};

/**
 * Route-level gate, used as `middleware: [requires(policies.admin)]`.
 * It runs after the root middleware (so capabilities are in context) and
 * before this route's loader and every descendant route's loader, so
 * children inherit the gate.
 */
export function requires(req: Requirement, opts: RequiresOptions = {}): MiddlewareFunction {
  return ({ context }) => {
    const result = check(context.get(capabilitiesContext), req);
    if (!result.ok) (opts.onDeny?.[result.reason] ?? defaults[result.reason])();
  };
}
