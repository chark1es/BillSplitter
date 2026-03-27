import type { AuthConfig } from "convex/server";
import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";

// JWKS is required in production for JWT token validation
// In development, we'll set it after first generating it
const authConfig = {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig;

export default authConfig;
