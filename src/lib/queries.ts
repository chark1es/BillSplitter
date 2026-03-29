import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import type { BillId } from "./types";

/** React Query cache key for `getViewerSession` (root `beforeLoad`). */
export const viewerSessionQueryKey = ["viewerSession"] as const;

export const fairShareQueries = {
  auth: {
    viewer: () => ({
      ...convexQuery(api.auth.viewer, {}),
      gcTime: 60_000,
    }),
  },
  admin: {
    allowedEmails: () => ({
      ...convexQuery(api.admin.listAllowedEmails, {}),
      gcTime: 15_000,
    }),
  },
  bills: {
    list: () => ({
      ...convexQuery(api.bills.listBills, {}),
      gcTime: 15_000,
    }),
    detail: (billId: BillId) => ({
      ...convexQuery(api.bills.getBill, { billId }),
      gcTime: 15_000,
    }),
  },
};
