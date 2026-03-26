import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";
import { getServerEnv } from "../env";

export const getServerAuth = () => {
  const env = getServerEnv();

  return convexBetterAuthReactStart({
    convexSiteUrl: env.convexSiteUrl,
    convexUrl: env.convexUrl,
  });
};
