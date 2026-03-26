import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  getCurrentViewer,
  isAuthBypassEnabled,
  requireCurrentViewer,
} from "./auth";

type ReaderCtx = QueryCtx | MutationCtx;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const getAdminEmail = () =>
  (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();

export const isAdminEmail = (email: string | undefined | null) => {
  const admin = getAdminEmail();
  if (!admin || !email) {
    return false;
  }
  return normalizeEmail(email) === admin;
};

export const isUserAllowlisted = async (
  ctx: ReaderCtx,
  email: string | undefined | null,
) => {
  if (isAuthBypassEnabled()) {
    return true;
  }
  if (!email) {
    return false;
  }
  const normalized = normalizeEmail(email);
  const admin = getAdminEmail();
  if (admin && normalized === admin) {
    return true;
  }
  const row = await ctx.db
    .query("allowedEmails")
    .withIndex("by_email", (q) => q.eq("email", normalized))
    .first();
  return Boolean(row);
};

/** Same as allowlisted viewer, but returns null if unauthenticated or not allowlisted (no throw). */
export const getAllowlistedViewerOrNull = async (ctx: ReaderCtx) => {
  const user = await getCurrentViewer(ctx);
  if (!user) {
    return null;
  }
  if (!(await isUserAllowlisted(ctx, user.email))) {
    return null;
  }
  return user;
};

export const requireAllowlistedViewer = async (ctx: ReaderCtx) => {
  const user = await requireCurrentViewer(ctx);
  if (!(await isUserAllowlisted(ctx, user.email))) {
    throw new Error("Forbidden");
  }
  return user;
};

export const getViewerAccess = async (ctx: ReaderCtx) => {
  const user = await getCurrentViewer(ctx);
  if (!user) {
    return { user: null as null, allowed: false, isAdmin: false };
  }
  const allowed = await isUserAllowlisted(ctx, user.email);
  const isAdmin = isAdminEmail(user.email);
  return {
    user,
    allowed,
    isAdmin,
  };
};
