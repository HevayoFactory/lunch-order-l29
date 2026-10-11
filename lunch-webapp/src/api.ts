import createClient, { type Middleware } from "openapi-fetch";
import type { components, paths } from "./generated/lunch-api";
import { authorizationHeader, classifyResponse, ForbiddenError } from "./authz/client";

export type Menu = components["schemas"]["Menu"];
export type MenuItem = components["schemas"]["MenuItem"];
export type Order = components["schemas"]["Order"];
export type OrderPage = components["schemas"]["OrderPage"];
export type ApiErrorBody = components["schemas"]["Error"];

// The authorization rule lives in src/authz/client.ts: attach the bearer, and
// let classifyResponse decide what a 401 means. Nothing about it is decided here.
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const header = await authorizationHeader();
    if (header) request.headers.set("Authorization", header);
    return request;
  },
  async onResponse({ response }) {
    if ((await classifyResponse(response.status)) === "forbidden") {
      throw new ForbiddenError(response.status);
    }
    return response;
  },
};

// Same-origin: nginx strips /api and proxies to lunch-api through the gateway.
export const lunchApi = createClient<paths>({ baseUrl: "/api" });
lunchApi.use(authMiddleware);

/** A readable line from an API error body, or the fallback. */
export function errorText(error: unknown, fallback: string): string {
  const body = error as Partial<ApiErrorBody> | undefined;
  return body?.description || body?.message || fallback;
}
