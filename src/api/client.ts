// Example of using capabilities OUTSIDE React: a plain API module.
import { policies } from "../capabilities/policy";
import { canNow, capabilitiesStore } from "../capabilities/store";

/** Guard in the client for a quick UI response. The server must still enforce it. */
export async function exportReport(): Promise<string> {
  if (!canNow(policies.reports)) throw new Error("Reports are not enabled for you");
  await new Promise((r) => setTimeout(r, 200)); // pretend fetch("/api/reports/export")
  return `report for org plan "${capabilitiesStore.get()!.org.plan}"`;
}

/**
 * Call this from anything that learns permissions changed: a websocket event,
 * a 403 from the API, a "settings saved" response. No React needed.
 */
export function onPermissionsChanged(): void {
  capabilitiesStore.invalidate();
}
