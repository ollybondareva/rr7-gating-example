import {
  Form,
  isRouteErrorResponse,
  Link,
  NavLink,
  Outlet,
  redirect,
  useLoaderData,
  useRouteError,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { readDemo, writeDemo } from "../api/mock";
import { policies } from "../capabilities/policy";
import { capabilitiesContext, userContext } from "../context";
import { exportReport } from "../api/client";
import { capabilitiesStore } from "../capabilities/store";
import { Can, useCapabilities } from "../ui/Can";
import { DevPanel } from "../ui/DevPanel";

/* ---------- shell (public) ---------- */
export function RootShell() {
  return (
    <div style={{ fontFamily: "system-ui", maxWidth: 820, margin: "24px auto", padding: "0 16px" }}>
      <Outlet />
    </div>
  );
}

/* ---------- login (public) ---------- */
export async function loginAction({ request }: ActionFunctionArgs) {
  writeDemo({ ...readDemo(), loggedIn: true });
  capabilitiesStore.invalidate();
  const from = new URL(request.url).searchParams.get("from") ?? "/";
  return redirect(from);
}
export function Login() {
  return (
    <Form method="post">
      <h1>Login</h1>
      <button type="submit">Log in as Olga</button>
    </Form>
  );
}

/* ---------- app layout (authenticated) ---------- */
// Middleware already ran. The loader just exposes caps to components via useRouteLoaderData("app").
export function appLoader({ context }: LoaderFunctionArgs) {
  return context.get(capabilitiesContext);
}

export async function logoutAction() {
  writeDemo({ ...readDemo(), loggedIn: false });
  capabilitiesStore.invalidate();
  return redirect("/login");
}

export function AppLayout() {
  const caps = useCapabilities();
  const link = ({ isActive }: { isActive: boolean }) => ({ marginRight: 12, fontWeight: isActive ? 700 : 400 });
  return (
    <>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <nav>
          <NavLink to="/" end style={link}>Dashboard</NavLink>
          <Can req={policies.reports}><NavLink to="/reports" style={link}>Reports</NavLink></Can>
          <Can req={policies.admin}><NavLink to="/admin" style={link}>Admin</NavLink></Can>
          <Can req={policies.billing}><NavLink to="/billing" style={link}>Billing</NavLink></Can>
          <Can req={policies.sso}><NavLink to="/sso" style={link}>SSO</NavLink></Can>
        </nav>
        <Form method="post" action="/logout">
          <small>{caps.user.name} · {caps.roles.join(",")} · {caps.org.plan} </small>
          <button type="submit">Logout</button>
        </Form>
      </header>
      <hr />
      <Outlet />
      <p style={{ fontSize: 12, color: "#666" }}>
        Links are hidden by &lt;Can&gt;, but every route is also guarded by middleware. Try typing{" "}
        <Link to="/admin">/admin</Link>, <Link to="/reports">/reports</Link>, <Link to="/billing">/billing</Link>,{" "}
        <Link to="/sso">/sso</Link> directly.
      </p>
      <DevPanel />
    </>
  );
}

/* ---------- pages ---------- */
export function dashboardLoader({ context }: LoaderFunctionArgs) {
  // Loaders read the same typed context as middleware.
  const user = context.get(userContext)!;
  const { flags } = context.get(capabilitiesContext);
  return { greeting: `Hi ${user.name}`, showAi: flags.aiAssistant };
}
export function Dashboard() {
  const { greeting } = useLoaderData<typeof dashboardLoader>();
  return (
    <section>
      <h1>{greeting}</h1>
      <Can req={policies.editContent} fallback={<p>Read-only (viewer).</p>}>
        <button>Edit content</button>
      </Can>
      <Can req={policies.aiAssistant} fallback={<p><Link to="/upgrade">Upgrade</Link> to use the AI assistant.</p>}>
        <p>🤖 AI assistant is available.</p>
      </Can>
    </section>
  );
}

/** Stand-in for real page data. Its existence also makes gate errors render in the "gated" boundary. */
export function pageLoader({ context, request }: LoaderFunctionArgs) {
  return { path: new URL(request.url).pathname, plan: context.get(capabilitiesContext).org.plan };
}

export function Reports() {
  return (
    <section>
      <h1>New reports (flag: newReports)</h1>
      {/* exportReport() lives in a plain module and checks capabilities without React */}
      <button onClick={() => exportReport().then(alert, (e) => alert(e.message))}>Export</button>
    </section>
  );
}

export function AdminLayout() {
  return (
    <section>
      <h1>Admin</h1>
      <nav>
        <NavLink to="/admin" end style={{ marginRight: 8 }}>Users</NavLink>
        <NavLink to="/admin/settings">Settings</NavLink>
      </nav>
      <Outlet />
    </section>
  );
}
export const AdminUsers = () => <p>Users list. This child route inherits the admin gate.</p>;

// Middleware also runs before actions, so this mutation is gated too.
export async function adminSettingsAction({ context }: ActionFunctionArgs) {
  const caps = context.get(capabilitiesContext);
  return { saved: true, by: caps.user.name };
}
export function AdminSettings() {
  return (
    <Form method="post">
      <p>Org settings (admin/owner only)</p>
      <button type="submit">Save</button>
    </Form>
  );
}

export const Billing = () => <h1>Billing (org.billingEnabled + owner)</h1>;
export const Sso = () => <h1>SSO config (enterprise + ssoEnabled + admin)</h1>;
export const Upgrade = () => (
  <section>
    <h1>Upgrade your plan</h1>
    <p>Your org's plan or settings don't include this feature.</p>
  </section>
);

/* ---------- errors ---------- */
/** Fallback when the error happens before app's loader ran (hard load), so it has no capabilities. */
export function AppError() {
  return (
    <>
      <header><Link to="/">← Dashboard</Link></header>
      <hr />
      <GateError />
    </>
  );
}

export function GateError() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return (
      <section>
        <h1>{error.status === 403 ? "403: Forbidden" : error.status === 404 ? "404: Not found" : error.status}</h1>
        <p>{(error.data as { message?: string })?.message}</p>
        <Link to="/">Back to dashboard</Link>
      </section>
    );
  }
  return <pre>{String(error)}</pre>;
}
