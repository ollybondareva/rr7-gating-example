import { createContext } from "react-router";
import type { Capabilities, User } from "./capabilities/types";

// Typed slots in the per-navigation RouterContextProvider.
export const userContext = createContext<User | null>(null);
export const capabilitiesContext = createContext<Capabilities>();

// Data mode has no runtime flag. This augmentation only switches loader/action/middleware
// `context` from `any` to `Readonly<RouterContextProvider>`, so `context.get()` is typed.
declare module "react-router" {
  interface Future {
    v8_middleware: true;
  }
}
