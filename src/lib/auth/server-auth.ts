import { getServerEnv } from "../env";
import { convexBetterAuthReactStart } from "./convex-better-auth-react-start";

export const getServerAuth = () => {
  const env = getServerEnv();

  return convexBetterAuthReactStart({
    convexSiteUrl: env.convexSiteUrl,
    convexUrl: env.convexUrl,
  });
};
