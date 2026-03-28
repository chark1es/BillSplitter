const BUILD_MARKER = "2026-03-28-auth-debug-1";

const COMMIT_ENV_KEYS = [
  "DOKPLOY_GIT_COMMIT_SHA",
  "SOURCE_COMMIT",
  "GIT_COMMIT_SHA",
  "COMMIT_SHA",
  "GITHUB_SHA",
  "CI_COMMIT_SHA",
  "VERCEL_GIT_COMMIT_SHA",
  "RAILWAY_GIT_COMMIT_SHA",
] as const;

const getCommitSha = () => {
  for (const key of COMMIT_ENV_KEYS) {
    const value = process.env[key];
    if (value?.trim()) {
      return value.trim();
    }
  }

  return null;
};

export const getBuildInfo = () => ({
  marker: BUILD_MARKER,
  commitSha: getCommitSha(),
  nodeEnv: process.env.NODE_ENV ?? null,
});

export const getBuildMarker = () => BUILD_MARKER;
