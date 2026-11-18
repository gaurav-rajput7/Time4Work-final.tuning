import { createAuthClient } from "@neondatabase/auth";
import { BetterAuthReactAdapter } from "@neondatabase/auth/react/adapters";

export function createTime4WorkAuthClient(baseUrl: string) {
  return createAuthClient(baseUrl, {
    adapter: BetterAuthReactAdapter(),
  });
}
