import { createServerFn } from "@tanstack/react-start";
import { api } from "../../../convex/_generated/api";
import { getServerAuth } from "../auth/server-auth";
import { getServerEnv, hasConfiguredConvex } from "../env";
import type { FxSnapshot } from "../types";
import { fetchUsdFxSnapshot } from "./usd-fx";

export const getFxSnapshot = createServerFn({ method: "POST" })
  .inputValidator((data: { currencyCode: string }) => data)
  .handler(async ({ data }): Promise<FxSnapshot> => {
    const env = getServerEnv();
    if (!hasConfiguredConvex(env.convexUrl) || !hasConfiguredConvex(env.convexSiteUrl)) {
      throw new Error("Not configured");
    }

    const auth = getServerAuth();
    const viewer = await auth.fetchAuthQuery(api.auth.viewer, {});
    if (!viewer?.allowed) {
      throw new Error("Unauthorized");
    }

    return fetchUsdFxSnapshot(data.currencyCode);
  });
