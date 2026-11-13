import type { Capabilities, FlagName, OrgSettings, Role } from "./types";

/**
 * A declarative requirement. All provided keys must pass (AND).
 * Use `anyOf` for OR, `allOf` to compose, `custom` as an escape hatch.
 */
export interface Requirement {
  /** User must have at least ONE of these roles. */
  roles?: Role[];
  /** ALL of these flags must be on. */
  flags?: FlagName[];
  /** Exact-match org settings, or a predicate. */
  org?: Partial<OrgSettings> | ((org: OrgSettings) => boolean);
  anyOf?: Requirement[];
  allOf?: Requirement[];
  custom?: (caps: Capabilities) => boolean;
}

/**
 * Why a check failed. The reason picks the HTTP-like outcome:
 *  - flag → 404 (feature doesn't exist for this user)
 *  - org  → redirect to /upgrade (org could unlock it)
 *  - role → 403 (exists but you're not allowed)
 */
export type DenyReason = "flag" | "org" | "role" | "custom";
export type CheckResult = { ok: true } | { ok: false; reason: DenyReason };

const OK: CheckResult = { ok: true };
const deny = (reason: DenyReason): CheckResult => ({ ok: false, reason });

// Ordered: flag first (hide existence), then org (upsell), then role (forbid).
export function check(caps: Capabilities, req: Requirement): CheckResult {
  if (req.flags && !req.flags.every((f) => caps.flags[f])) return deny("flag");

  if (req.org) {
    const pass =
      typeof req.org === "function"
        ? req.org(caps.org)
        : Object.entries(req.org).every(
            ([k, v]) => caps.org[k as keyof OrgSettings] === v,
          );
    if (!pass) return deny("org");
  }

  if (req.roles && !req.roles.some((r) => caps.roles.includes(r))) return deny("role");

  if (req.custom && !req.custom(caps)) return deny("custom");

  if (req.allOf) {
    for (const r of req.allOf) {
      const res = check(caps, r);
      if (!res.ok) return res;
    }
  }

  if (req.anyOf && req.anyOf.length > 0) {
    const results = req.anyOf.map((r) => check(caps, r));
    if (!results.some((r) => r.ok)) return results[0];
  }

  return OK;
}

export const can = (caps: Capabilities, req: Requirement) => check(caps, req).ok;

/** Named policies — keep them in one place so routes and UI agree. */
export const policies = {
  reports: { flags: ["newReports"] },
  admin: { roles: ["admin", "owner"] },
  billing: { org: { billingEnabled: true }, roles: ["owner"] },
  sso: { org: (o) => o.plan === "enterprise" && o.ssoEnabled, roles: ["admin", "owner"] },
  aiAssistant: {
    flags: ["aiAssistant"],
    anyOf: [{ org: { plan: "pro" } }, { org: { plan: "enterprise" } }],
  },
  editContent: { roles: ["editor", "admin", "owner"] },
} satisfies Record<string, Requirement>;
