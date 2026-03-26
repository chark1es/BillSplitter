import { v } from "convex/values";
import { internalAction, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { normalizeEmail, requireAllowlistedViewer, isAdminEmail } from "./access";

const buildInviteEmailHtml = (params: {
  appUrl: string;
  inviteeEmail: string;
  inviterName?: string;
}) => {
  const { appUrl, inviteeEmail, inviterName } = params;
  const safeUrl = appUrl.replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>You're invited</title>
</head>
<body style="margin:0;background:#efe7da;font-family:Georgia,'Times New Roman',serif;color:#1f1611;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(165deg,#f6f2ea 0%,#efe7da 45%,#e8dcc8 100%);padding:48px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;border-radius:28px;overflow:hidden;border:1px solid rgba(95,62,34,0.12);background:rgba(255,252,246,0.96);box-shadow:0 24px 60px rgba(46,31,20,0.12);">
          <tr>
            <td style="padding:36px 32px 8px;">
              <p style="margin:0;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:#9c4e1f;font-weight:700;">FairShare</p>
              <h1 style="margin:12px 0 0;font-size:28px;line-height:1.1;letter-spacing:-0.03em;font-weight:700;">You're invited</h1>
              <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#695347;">
                ${inviterName ? `${inviterName} added you` : "An administrator added you"} to split bills on FairShare — invite-only access for <strong>${inviteeEmail}</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 36px;">
              <a href="${safeUrl}/login" style="display:inline-block;padding:14px 28px;border-radius:999px;background:#9c4e1f;color:#fffaf5;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.02em;">
                Sign in with Google
              </a>
              <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#695347;">
                Use the Google account that matches this email. If you need help, reply to whoever sent this invite.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const listAllowedEmails = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAllowlistedViewer(ctx);
    if (!isAdminEmail(user.email)) {
      throw new Error("Forbidden");
    }
    const rows = await ctx.db.query("allowedEmails").collect();
    return rows
      .map((row) => ({
        id: row._id,
        email: row.email,
        invitedAt: row.invitedAt,
        invitedByUserId: row.invitedByUserId,
      }))
      .sort((a, b) => b.invitedAt - a.invitedAt);
  },
});

export const inviteEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAllowlistedViewer(ctx);
    if (!isAdminEmail(user.email)) {
      throw new Error("Forbidden");
    }
    const normalized = normalizeEmail(args.email);
    if (!normalized.includes("@")) {
      throw new Error("Invalid email");
    }
    const existing = await ctx.db
      .query("allowedEmails")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .first();
    if (!existing) {
      await ctx.db.insert("allowedEmails", {
        email: normalized,
        invitedAt: Date.now(),
        invitedByUserId: user._id,
      });
    }
    await ctx.scheduler.runAfter(0, internal.admin.sendInviteEmailInternal, {
      email: normalized,
      inviterName: user.name ?? undefined,
    });
    return { ok: true as const };
  },
});

export const removeAllowedEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAllowlistedViewer(ctx);
    if (!isAdminEmail(user.email)) {
      throw new Error("Forbidden");
    }
    const normalized = normalizeEmail(args.email);
    if (normalized === normalizeEmail(user.email ?? "")) {
      throw new Error("Cannot remove your own access");
    }
    const row = await ctx.db
      .query("allowedEmails")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .first();
    if (row) {
      await ctx.db.delete(row._id);
    }
    return { ok: true as const };
  },
});

export const sendInviteEmailInternal = internalAction({
  args: {
    email: v.string(),
    inviterName: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM;
    const appUrl =
      process.env.APP_PUBLIC_URL ??
      process.env.BETTER_AUTH_URL ??
      process.env.VITE_APP_URL ??
      "http://localhost:3000";
    if (!apiKey || !from) {
      console.warn("invite email skipped: RESEND_API_KEY or RESEND_FROM unset");
      return;
    }
    const html = buildInviteEmailHtml({
      appUrl: appUrl.replace(/\/$/, ""),
      inviteeEmail: args.email,
      inviterName: args.inviterName,
    });
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [args.email],
        subject: "You're invited to FairShare",
        html,
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Resend failed: ${response.status} ${text}`);
    }
  },
});
