// Runs the real route tree in a memory router and checks each gate's outcome.
const store: Record<string, string> = {};
(globalThis as any).localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => (store[k] = v) };

const { createMemoryRouter, RouterContextProvider } = await import("react-router");
const { routes } = await import("../src/routes");
const { writeDemo, readDemo } = await import("../src/api/mock");
const { capabilitiesStore, canNow } = await import("../src/capabilities/store");
const { policies } = await import("../src/capabilities/policy");

async function visit(path: string, patch: any = {}, clientNav = false) {
  writeDemo({ ...readDemo(), ...patch });
  capabilitiesStore.invalidate();
  const router = createMemoryRouter(routes, { initialEntries: [clientNav ? "/" : path], getContext: () => new RouterContextProvider() });
  await new Promise<void>((res) => (router.state.initialized ? res() : router.subscribe((st) => st.initialized && res())));
  if (clientNav) await router.navigate(path);
  const s = router.state;
  const [boundary, err] = (s.errors ? Object.entries(s.errors)[0] : []) as [string, any];
  const wantBoundary = clientNav ? "gated" : "app";
  if (err && boundary !== wantBoundary) return `error ${err.status} caught by ${boundary} (nav lost)`;
  return err ? `error ${err.status}` : `at ${s.location.pathname}`;
}

const base = { loggedIn: true, roles: ["viewer"], flags: { newReports: false, aiAssistant: true }, org: { plan: "free", billingEnabled: true, ssoEnabled: true } };
const cases: [string, string, any, string][] = [
  ["logged out", "/admin", { ...base, loggedIn: false }, "at /login"],
  ["dashboard viewer", "/", base, "at /"],
  ["reports flag off", "/reports", base, "error 404"],
  ["reports flag on", "/reports", { ...base, flags: { ...base.flags, newReports: true } }, "at /reports"],
  ["admin as viewer", "/admin/settings", base, "error 403"],
  ["admin as admin", "/admin/settings", { ...base, roles: ["admin"] }, "at /admin/settings"],
  ["billing disabled", "/billing", { ...base, roles: ["owner"], org: { ...base.org, billingEnabled: false } }, "at /upgrade"],
  ["billing as admin", "/billing", { ...base, roles: ["admin"] }, "error 403"],
  ["billing as owner", "/billing", { ...base, roles: ["owner"] }, "at /billing"],
  ["sso on free", "/sso", { ...base, roles: ["admin"] }, "at /upgrade"],
  ["sso enterprise", "/sso", { ...base, roles: ["admin"], org: { ...base.org, plan: "enterprise" } }, "at /sso"],
];
let fail = 0;
for (const [name, path, state, want] of cases.flatMap(([n, p, st, w]) => [[n, p, st, w, false], [n + " (nav)", p, st, w, true]] as const)) {
  if (name.startsWith("logged out (nav)")) continue; // can't start at "/" while logged out
  const got = await visit(path, state, name.endsWith("(nav)"));
  if (got !== want) fail++;
  console.log(`${got === want ? "PASS" : "FAIL"}  ${name.padEnd(24)} ${path.padEnd(16)} ${got}${got === want ? "" : `  (want ${want})`}`);
}
// Outside React: after a navigation, the store holds the same values the gates used.
await visit("/", { ...base, roles: ["admin"] });
const outside = [canNow(policies.admin) === true, canNow(policies.billing) === false, capabilitiesStore.get()?.roles[0] === "admin"];
console.log(`${outside.every(Boolean) ? "PASS" : "FAIL"}  store readable outside React`);
if (!outside.every(Boolean)) fail++;
process.exit(fail ? 1 : 0);
