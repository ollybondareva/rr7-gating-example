export type Role = "viewer" | "editor" | "admin" | "owner";

export interface FeatureFlags {
  newReports: boolean;
  aiAssistant: boolean;
}
export type FlagName = keyof FeatureFlags;

export interface OrgSettings {
  plan: "free" | "pro" | "enterprise";
  billingEnabled: boolean;
  ssoEnabled: boolean;
}

export interface User {
  id: string;
  name: string;
  orgId: string;
}

/** Everything gating needs, resolved once per navigation by middleware. */
export interface Capabilities {
  user: User;
  roles: Role[];
  flags: FeatureFlags;
  org: OrgSettings;
}
