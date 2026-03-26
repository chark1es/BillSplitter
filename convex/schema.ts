import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  allowedEmails: defineTable({
    email: v.string(),
    invitedAt: v.number(),
    invitedByUserId: v.optional(v.string()),
  }).index("by_email", ["email"]),

  bills: defineTable({
    ownerId: v.string(),
    title: v.string(),
    sourceType: v.union(v.literal("demo-receipt"), v.literal("parsed-receipt")),
    status: v.union(v.literal("draft"), v.literal("confirmed")),
    imageNames: v.array(v.string()),
    receiptImageUrls: v.optional(v.array(v.string())),
    grandTotal: v.number(),
    taxAmount: v.optional(v.number()),
    tipAmount: v.optional(v.number()),
    taxTipMode: v.optional(
      v.union(v.literal("proportional"), v.literal("equal")),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    confirmedAt: v.optional(v.number()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_and_status", ["ownerId", "status"])
    .index("by_status_updated", ["status", "updatedAt"]),

  billParticipants: defineTable({
    billId: v.id("bills"),
    name: v.string(),
    initials: v.string(),
    color: v.string(),
    isSelf: v.boolean(),
    sortOrder: v.number(),
  }).index("by_bill", ["billId"]),

  billItems: defineTable({
    billId: v.id("bills"),
    name: v.string(),
    originalLabel: v.optional(v.string()),
    price: v.number(),
    sortOrder: v.number(),
  }).index("by_bill", ["billId"]),

  billAssignments: defineTable({
    billId: v.id("bills"),
    itemId: v.id("billItems"),
    participantId: v.id("billParticipants"),
  })
    .index("by_bill", ["billId"])
    .index("by_bill_and_item", ["billId", "itemId"])
    .index("by_bill_and_participant", ["billId", "participantId"]),
});
