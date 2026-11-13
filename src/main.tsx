import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterContextProvider } from "react-router";
import { RouterProvider } from "react-router/dom";
import { capabilitiesStore } from "./capabilities/store";
import { routes } from "./routes";

const router = createBrowserRouter(routes, {
  // A fresh context for every navigation/fetch. You can seed it here,
  // e.g. `new RouterContextProvider(new Map([[apiClientContext, api]]))`.
  getContext: () => new RouterContextProvider(),
});

// Outside-React wiring: when the store is invalidated (from anywhere), re-run
// middleware so the current page is checked again. Skipped during an
// action/navigation, because the router revalidates after those anyway.
capabilitiesStore.subscribe(() => {
  if (capabilitiesStore.get() === null && router.state.navigation.state === "idle") {
    router.revalidate();
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
