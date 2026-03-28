import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { getPublicEnv } from "../env";

const getAuthBaseUrl = () => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/auth`;
  }

  const appUrl = getPublicEnv().appUrl;
  return `${appUrl}/api/auth`;
};

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  plugins: [convexClient()],
  // Prod: fewer parallel hits to /api/auth/* → Node/Bun → *.convex.site (CF); bursts → intermittent 403 HTML.
  sessionOptions: {
    refetchOnWindowFocus: false,
  },
});
