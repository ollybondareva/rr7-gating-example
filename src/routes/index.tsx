import type { RouteObject } from "react-router";
import { policies } from "../capabilities/policy";
import { authMiddleware } from "../middleware/auth";
import { capabilitiesMiddleware } from "../middleware/capabilities";
import { requires } from "../middleware/requires";
import * as P from "./pages";

/**
 * Middleware order for /admin/settings:
 *   authMiddleware → capabilitiesMiddleware → requires(admin) → loaders/action
 * Parent middleware always runs before child middleware. A throw anywhere stops
 * the chain, so no loader below it runs and nothing is fetched.
 *
 * Where a middleware error renders (7.9 rule): the boundary search starts at the
 * SHALLOWER of (a) the throwing route and (b) the shallowest route that needs to
 * load data in this navigation. If no route needs to load, it starts at the ROOT.
 * So: give gated routes a loader and give the middleware-owning route a boundary.
 */
export const routes: RouteObject[] = [
  {
    path: "/",
    Component: P.RootShell,
    ErrorBoundary: P.GateError,
    children: [
      { path: "login", Component: P.Login, action: P.loginAction },
      { path: "logout", action: P.logoutAction },

      {
        id: "app",
        middleware: [authMiddleware, capabilitiesMiddleware],
        loader: P.appLoader,
        Component: P.AppLayout,
        // Hard load: app's loader still has to run, so a middleware throw bubbles from HERE.
        // No loader data exists yet, so this boundary must not need capabilities.
        ErrorBoundary: P.AppError,
        children: [
          {
            // Client-side nav: app's loader doesn't revalidate, so the throw bubbles from the
            // gated route (it has a loader) to here, and renders INSIDE AppLayout with the nav kept.
            id: "gated",
            ErrorBoundary: P.GateError,
            children: [
              { index: true, loader: P.dashboardLoader, Component: P.Dashboard },
              { path: "upgrade", Component: P.Upgrade },
              {
                path: "reports",
                middleware: [requires(policies.reports)], // feature flag → 404
                loader: P.pageLoader,
                Component: P.Reports,
              },
              {
                path: "admin",
                middleware: [requires(policies.admin)], // role → 403, inherited by children
                loader: P.pageLoader,
                Component: P.AdminLayout,
                children: [
                  { index: true, Component: P.AdminUsers },
                  { path: "settings", Component: P.AdminSettings, action: P.adminSettingsAction },
                ],
              },
              {
                path: "billing",
                middleware: [requires(policies.billing)], // org setting → /upgrade, role → 403
                loader: P.pageLoader,
                Component: P.Billing,
              },
              {
                path: "sso",
                middleware: [requires(policies.sso)],
                loader: P.pageLoader,
                Component: P.Sso,
              },
            ],
          },
        ],
      },
    ],
  },
];
