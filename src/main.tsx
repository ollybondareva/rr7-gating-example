import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterContextProvider } from "react-router";
import { RouterProvider } from "react-router/dom";
import { routes } from "./routes";

const router = createBrowserRouter(routes, {
  // A fresh context for every navigation/fetch. You can seed it here,
  // e.g. `new RouterContextProvider(new Map([[apiClientContext, api]]))`.
  getContext: () => new RouterContextProvider(),
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
