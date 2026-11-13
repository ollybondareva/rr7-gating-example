// Fake backend. State lives in localStorage so the DevPanel can flip things.
import type { FeatureFlags, OrgSettings, Role, User } from "../capabilities/types";

export interface DemoState {
  loggedIn: boolean;
  roles: Role[];
  flags: FeatureFlags;
  org: OrgSettings;
}

const KEY = "rr-gating-demo";
const DEFAULT: DemoState = {
  loggedIn: true,
  roles: ["viewer"],
  flags: { newReports: false, aiAssistant: true },
  org: { plan: "free", billingEnabled: true, ssoEnabled: true },
};

export function readDemo(): DemoState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}
export function writeDemo(s: DemoState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchSession(): Promise<User | null> {
  await delay(50);
  return readDemo().loggedIn ? { id: "u1", name: "Olga", orgId: "org1" } : null;
}
export async function fetchRoles(_userId: string): Promise<Role[]> {
  await delay(120);
  return readDemo().roles;
}
export async function fetchFlags(_userId: string, _orgId: string): Promise<FeatureFlags> {
  await delay(150);
  return readDemo().flags;
}
export async function fetchOrgSettings(_orgId: string): Promise<OrgSettings> {
  await delay(100);
  return readDemo().org;
}
