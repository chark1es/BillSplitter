import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "delete stale drafts (30d since last update)",
  { hourUTC: 9, minuteUTC: 0 },
  internal.bills.deleteExpiredDrafts,
);

export default crons;
