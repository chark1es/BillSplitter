import { createUploadthing, UploadThingError, type FileRouter } from "uploadthing/server";
import { api } from "../../convex/_generated/api";
import { getServerAuth } from "../lib/auth/server-auth";
import { getServerEnv, hasConfiguredConvex } from "../lib/env";

const f = createUploadthing();

export const uploadRouter = {
  receiptImage: f({
    image: { maxFileSize: "8MB", maxFileCount: 6 },
    pdf: { maxFileSize: "6MB", maxFileCount: 6 },
  })
    .middleware(async () => {
      const env = getServerEnv();
      if (!hasConfiguredConvex(env.convexUrl) || !hasConfiguredConvex(env.convexSiteUrl)) {
        throw new UploadThingError("Server misconfigured");
      }
      const auth = getServerAuth();
      let viewer: {
        id: string;
        allowed: boolean;
      } | null;
      try {
        viewer = await auth.fetchAuthQuery(api.auth.viewer, {});
      } catch {
        throw new UploadThingError("Unauthorized");
      }
      if (!viewer || !viewer.allowed) {
        throw new UploadThingError("Unauthorized");
      }
      return { userId: viewer.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { ufsUrl: file.ufsUrl, uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
