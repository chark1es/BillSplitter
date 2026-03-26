import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { getPublicEnv } from "../env";

export const authClient = createAuthClient({
  baseURL: `${getPublicEnv().appUrl}/api/auth`,
  plugins: [convexClient()],
});
