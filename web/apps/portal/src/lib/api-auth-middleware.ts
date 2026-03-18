import type { Middleware } from "openapi-fetch";
import { getAuthzClient } from "./authz-client";

export const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const client = getAuthzClient();
    const headers = client.getHeaders();
    for (const [key, value] of Object.entries(headers)) {
      request.headers.set(key, value);
    }
    return request;
  },
};
