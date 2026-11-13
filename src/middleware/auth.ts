import { redirect, type MiddlewareFunction } from "react-router";
import { fetchSession } from "../api/mock";
import { userContext } from "../context";

/** Root middleware #1: no session → /login. Otherwise puts the user in context. */
export const authMiddleware: MiddlewareFunction = async ({ request, context }) => {
  const user = await fetchSession();
  if (!user) {
    const from = new URL(request.url).pathname;
    throw redirect(`/login?from=${encodeURIComponent(from)}`);
  }
  context.set(userContext, user);
  // No need to call next() in client middleware unless you do work after it;
  // the router calls it for you.
};
