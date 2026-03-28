/**
 * Fork of @convex-dev/better-auth/react-start: server-side getToken() must use the
 * app's public origin (BETTER_AUTH_URL / appUrl), not *.convex.site, so requests hit
 * /api/auth/* on this host and go through our proxy (undici + Set-Cookie fixes).
 * Direct fetch from the deployment to convex.site often gets Cloudflare 403; the browser
 * path works, which caused "token OK in Network tab but router still on /login".
 */
import { stripIndent } from "common-tags";
import { ConvexHttpClient } from "convex/browser";
import type {
  FunctionReference,
  FunctionReturnType,
  OptionalRestArgs,
} from "convex/server";
import React from "react";
import { getToken } from "@convex-dev/better-auth/utils";
import { getServerEnv } from "../env";

const cache =
  React.cache ||
  ((fn: (...args: unknown[]) => unknown) => {
    return (...args: unknown[]) => fn(...args);
  });

function setupClient(options: {
  convexUrl: string;
  token?: string;
}) {
  const client = new ConvexHttpClient(options.convexUrl);
  if (options.token !== undefined) {
    client.setAuth(options.token);
  }
  // @ts-expect-error - setFetchOptions is internal
  client.setFetchOptions({ cache: "no-store" });
  return client;
}

const parseConvexSiteUrl = (url: string | undefined) => {
  if (!url) {
    throw new Error(stripIndent`
      CONVEX_SITE_URL is not set.
      This is automatically set in the Convex backend, but must be set in the TanStack Start environment.
      For local development, this can be set in the .env.local file.
    `);
  }
  if (url.endsWith(".convex.cloud")) {
    throw new Error(stripIndent`
      CONVEX_SITE_URL should be set to your Convex Site URL, which ends in .convex.site.
      Currently set to ${url}.
    `);
  }
  return url;
};

const handler = (
  request: Request,
  opts: { convexSiteUrl: string },
) => {
  const requestUrl = new URL(request.url);
  const nextUrl = `${opts.convexSiteUrl}${requestUrl.pathname}${requestUrl.search}`;
  const headers = new Headers(request.headers);
  headers.set("accept-encoding", "application/json");
  headers.set("host", new URL(opts.convexSiteUrl).host);
  return fetch(nextUrl, {
    method: request.method,
    headers,
    redirect: "manual",
    body: request.body,
    // @ts-expect-error duplex is required for streaming request bodies in modern fetch
    duplex: "half",
  });
};

export const convexBetterAuthReactStart = (
  opts: Omit<GetTokenOptions, "forceRefresh"> & {
    convexUrl: string;
    convexSiteUrl: string;
  },
) => {
  parseConvexSiteUrl(opts.convexSiteUrl);

  const cachedGetToken = cache(async (tokenOpts: typeof opts) => {
      const { getRequestHeaders } = await import("@tanstack/react-start/server");
      const headers = getRequestHeaders();
      const mutableHeaders = new Headers(headers);
      mutableHeaders.delete("content-length");
      mutableHeaders.delete("transfer-encoding");
      mutableHeaders.set("accept-encoding", "identity");
      const authHttpBase = getServerEnv().appUrl.replace(/\/$/, "");
      return getToken(authHttpBase, mutableHeaders, tokenOpts);
    },
  );

  const callWithToken = async <T>(
    fn: (token: string | undefined) => Promise<T>,
  ): Promise<T> => {
    const tokenResult = (await cachedGetToken(opts)) ?? {
      isFresh: true,
      token: undefined as string | undefined,
    };
    try {
      return await fn(tokenResult.token);
    } catch (error) {
      if (
        !opts?.jwtCache?.enabled ||
        tokenResult.isFresh ||
        opts.jwtCache?.isAuthError?.(error)
      ) {
        throw error;
      }
      const newToken = await cachedGetToken({
        ...opts,
        forceRefresh: true,
      });
      return await fn(newToken.token);
    }
  };

  return {
    getToken: async () => {
      const token = await cachedGetToken(opts);
      return token.token;
    },
    handler: (request: Request) => handler(request, opts),
    fetchAuthQuery: async <Query extends FunctionReference<"query">>(
      query: Query,
      ...args: OptionalRestArgs<Query>
    ): Promise<FunctionReturnType<Query>> => {
      return callWithToken((token) => {
        const client = setupClient({ ...opts, token });
        return client.query(query, ...args);
      });
    },
    fetchAuthMutation: async <Mutation extends FunctionReference<"mutation">>(
      mutation: Mutation,
      ...args: OptionalRestArgs<Mutation>
    ): Promise<FunctionReturnType<Mutation>> => {
      return callWithToken((token) => {
        const client = setupClient({ ...opts, token });
        return client.mutation(mutation, ...args);
      });
    },
    fetchAuthAction: async <Action extends FunctionReference<"action">>(
      action: Action,
      ...args: OptionalRestArgs<Action>
    ): Promise<FunctionReturnType<Action>> => {
      return callWithToken((token) => {
        const client = setupClient({ ...opts, token });
        return client.action(action, ...args);
      });
    },
  };
};
