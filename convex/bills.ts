import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  getAllowlistedViewerOrNull,
  requireAllowlistedViewer,
} from "./access";

type ReaderCtx = QueryCtx | MutationCtx;

const requireOwner = async (ctx: ReaderCtx) => {
  const user = await requireAllowlistedViewer(ctx);
  return user;
};

/** For mutations: throws if not signed in / allowlisted / owner. */
const loadBill = async (ctx: ReaderCtx, billId: Id<"bills">) => {
  const bill = await ctx.db.get(billId);
  if (!bill) {
    return null;
  }

  const owner = await requireOwner(ctx);
  if (bill.ownerId !== owner._id) {
    return null;
  }

  return bill;
};

/** For queries: returns null if unauthenticated, not allowlisted, or not owner (no throw). */
const loadBillForViewer = async (ctx: ReaderCtx, billId: Id<"bills">) => {
  const user = await getAllowlistedViewerOrNull(ctx);
  if (!user) {
    return null;
  }
  const bill = await ctx.db.get(billId);
  if (!bill || bill.ownerId !== user._id) {
    return null;
  }
  return bill;
};

const getBillParticipants = async (ctx: ReaderCtx, billId: Id<"bills">) => {
  return await ctx.db
    .query("billParticipants")
    .withIndex("by_bill", (queryBuilder) => queryBuilder.eq("billId", billId))
    .collect();
};

const getBillItems = async (ctx: ReaderCtx, billId: Id<"bills">) => {
  return await ctx.db
    .query("billItems")
    .withIndex("by_bill", (queryBuilder) => queryBuilder.eq("billId", billId))
    .collect();
};

const getBillAssignments = async (ctx: ReaderCtx, billId: Id<"bills">) => {
  return await ctx.db
    .query("billAssignments")
    .withIndex("by_bill", (queryBuilder) => queryBuilder.eq("billId", billId))
    .collect();
};

const deleteBillCascade = async (ctx: MutationCtx, billId: Id<"bills">) => {
  const assignments = await getBillAssignments(ctx, billId);
  for (const assignment of assignments) {
    await ctx.db.delete(assignment._id);
  }
  const items = await getBillItems(ctx, billId);
  for (const item of items) {
    await ctx.db.delete(item._id);
  }
  const participants = await getBillParticipants(ctx, billId);
  for (const participant of participants) {
    await ctx.db.delete(participant._id);
  }
  await ctx.db.delete(billId);
};

const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const itemsSubtotal = (items: { price: number }[]) =>
  items.reduce((sum, item) => sum + item.price, 0);

/** Defaults for bills created before receiptImageUrls / tax / tip fields existed. */
const billFinancialDefaults = (bill: {
  receiptImageUrls?: string[];
  currencyCode?: string;
  fxSnapshot?: {
    baseCurrency: "USD";
    currencyCode: string;
    date: string;
    foreignUnitsPerUsd: number;
    lastUpdatedAt?: string;
    rateSource?: "currencyapi" | "frankfurter" | "parity";
  };
  taxForeignAmount?: number;
  tipForeignAmount?: number;
  taxAmount?: number;
  tipAmount?: number;
  taxTipMode?: "proportional" | "equal";
}) => ({
  receiptImageUrls: bill.receiptImageUrls ?? [],
  currencyCode: bill.currencyCode,
  fxSnapshot: bill.fxSnapshot,
  taxForeignAmount: bill.taxForeignAmount,
  tipForeignAmount: bill.tipForeignAmount,
  taxAmount: bill.taxAmount ?? 0,
  tipAmount: bill.tipAmount ?? 0,
  taxTipMode: bill.taxTipMode ?? ("proportional" as const),
});

const getNextStep = ({
  participantCount,
  itemCount,
  assignmentCount,
  status,
}: {
  participantCount: number;
  itemCount: number;
  assignmentCount: number;
  status: "draft" | "confirmed";
}) => {
  if (status === "confirmed") {
    return "share" as const;
  }

  if (participantCount < 2) {
    return "participants" as const;
  }

  if (itemCount === 0) {
    return "review" as const;
  }

  if (assignmentCount < itemCount) {
    return "assign" as const;
  }

  return "review" as const;
};

const billPayload = (
  bill: NonNullable<Awaited<ReturnType<typeof loadBill>>>,
  participants: Awaited<ReturnType<typeof getBillParticipants>>,
  items: Awaited<ReturnType<typeof getBillItems>>,
  assignments: Awaited<ReturnType<typeof getBillAssignments>>,
) => {
  const orderedParticipants = participants.sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );
  const orderedItems = items.sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );

  const fin = billFinancialDefaults(bill);
  return {
    id: bill._id,
    title: bill.title,
    status: bill.status,
    imageNames: bill.imageNames,
    receiptImageUrls: fin.receiptImageUrls,
    receiptMetadata:
      fin.currencyCode && fin.fxSnapshot
        ? {
            currencyCode: fin.currencyCode,
            fxSnapshot: fin.fxSnapshot,
            taxForeignAmount: fin.taxForeignAmount ?? fin.taxAmount,
            tipForeignAmount: fin.tipForeignAmount ?? fin.tipAmount,
          }
        : null,
    createdAt: bill.createdAt,
    updatedAt: bill.updatedAt,
    grandTotal: bill.grandTotal,
    taxAmount: fin.taxAmount,
    tipAmount: fin.tipAmount,
    taxTipMode: fin.taxTipMode,
    participants: orderedParticipants.map((participant) => ({
      id: participant._id,
      name: participant.name,
      initials: participant.initials,
      color: participant.color,
      isSelf: participant.isSelf,
    })),
    items: orderedItems.map((item) => ({
      id: item._id,
      name: item.name,
      originalLabel: item.originalLabel,
      foreignPrice: item.foreignPrice ?? item.price,
      usdPrice: item.usdPrice ?? item.price,
      price: item.price,
    })),
    assignments: assignments.map((assignment) => ({
      id: assignment._id,
      itemId: assignment.itemId,
      participantId: assignment.participantId,
    })),
  };
};

export const listBills = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAllowlistedViewerOrNull(ctx);
    if (!user) {
      return [];
    }
    const bills = await ctx.db
      .query("bills")
      .withIndex("by_owner", (queryBuilder) => queryBuilder.eq("ownerId", user._id))
      .collect();

    const detailedBills = await Promise.all(
      bills.map(async (bill) => {
        const [participants, items, assignments] = await Promise.all([
          getBillParticipants(ctx, bill._id),
          getBillItems(ctx, bill._id),
          getBillAssignments(ctx, bill._id),
        ]);

        const fin = billFinancialDefaults(bill);
        return {
          id: bill._id,
          title: bill.title,
          status: bill.status,
          createdAt: bill.createdAt,
          updatedAt: bill.updatedAt,
          grandTotal: bill.grandTotal,
          imageNames: bill.imageNames,
          receiptImageUrls: fin.receiptImageUrls,
          participantCount: participants.length,
          itemCount: items.length,
          assignmentCount: new Set(
            assignments.map((assignment) => assignment.itemId),
          ).size,
          nextStep: getNextStep({
            participantCount: participants.length,
            itemCount: items.length,
            assignmentCount: new Set(
              assignments.map((assignment) => assignment.itemId),
            ).size,
            status: bill.status,
          }),
        };
      }),
    );

    return detailedBills.sort((left, right) => right.updatedAt - left.updatedAt);
  },
});

const parsedItemValidator = v.object({
  name: v.string(),
  price: v.number(),
  originalLabel: v.optional(v.string()),
  foreignPrice: v.number(),
  usdPrice: v.number(),
});

const receiptMetadataValidator = v.object({
  currencyCode: v.string(),
  fxSnapshot: v.object({
    baseCurrency: v.literal("USD"),
    currencyCode: v.string(),
    date: v.string(),
    foreignUnitsPerUsd: v.number(),
    lastUpdatedAt: v.optional(v.string()),
    rateSource: v.optional(
      v.union(
        v.literal("currencyapi"),
        v.literal("frankfurter"),
        v.literal("parity"),
      ),
    ),
  }),
  taxForeignAmount: v.number(),
  tipForeignAmount: v.number(),
});

const insertBillItems = async (
  ctx: MutationCtx,
  billId: Id<"bills">,
  items: Array<{
    name: string;
    price: number;
    originalLabel?: string;
    foreignPrice: number;
    usdPrice: number;
  }>,
) => {
  const itemIds: Id<"billItems">[] = [];
  for (const [sortOrder, item] of items.entries()) {
    const insertedId = await ctx.db.insert("billItems", {
      billId,
      name: item.name,
      price: item.price,
      originalLabel: item.originalLabel,
      foreignPrice: item.foreignPrice,
      usdPrice: item.usdPrice,
      sortOrder,
    });
    itemIds.push(insertedId);
  }
  return itemIds;
};

const insertBillParticipants = async (
  ctx: MutationCtx,
  billId: Id<"bills">,
  participants: Array<{
    name: string;
    initials: string;
    color: string;
    isSelf: boolean;
  }>,
) => {
  const participantIds: Id<"billParticipants">[] = [];
  for (const [sortOrder, participant] of participants.entries()) {
    const insertedId = await ctx.db.insert("billParticipants", {
      billId,
      name: participant.name,
      initials: participant.initials,
      color: participant.color,
      isSelf: participant.isSelf,
      sortOrder,
    });
    participantIds.push(insertedId);
  }
  return participantIds;
};

export const createDraftBill = mutation({
  args: {
    receiptImageUrls: v.array(v.string()),
    title: v.optional(v.string()),
    items: v.array(parsedItemValidator),
    taxAmount: v.number(),
    tipAmount: v.number(),
    taxTipMode: v.union(v.literal("proportional"), v.literal("equal")),
  },
  handler: async (ctx, args) => {
    const user = await requireOwner(ctx);
    const timestamp = Date.now();
    const subtotal = itemsSubtotal(args.items);
    const grandTotal = subtotal + args.taxAmount + args.tipAmount;
    const billId = await ctx.db.insert("bills", {
      ownerId: user._id,
      title: args.title?.trim() || "Receipt",
      sourceType: "parsed-receipt",
      status: "draft",
      imageNames: [],
      receiptImageUrls: args.receiptImageUrls,
      grandTotal,
      taxAmount: args.taxAmount,
      tipAmount: args.tipAmount,
      taxTipMode: args.taxTipMode,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await insertBillItems(ctx, billId, args.items);

    return { billId };
  },
});

export const createConfirmedBill = mutation({
  args: {
    billId: v.optional(v.id("bills")),
    receiptImageUrls: v.array(v.string()),
    title: v.optional(v.string()),
    items: v.array(parsedItemValidator),
    itemLocalIds: v.array(v.string()),
    receiptMetadata: receiptMetadataValidator,
    taxAmount: v.number(),
    tipAmount: v.number(),
    taxTipMode: v.union(v.literal("proportional"), v.literal("equal")),
    participants: v.array(
      v.object({
        name: v.string(),
        initials: v.string(),
        color: v.string(),
        isSelf: v.boolean(),
      }),
    ),
    participantLocalIds: v.array(v.string()),
    assignments: v.array(
      v.object({
        itemLocalId: v.string(),
        participantLocalIds: v.array(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireOwner(ctx);
    const timestamp = Date.now();

    if (args.itemLocalIds.length !== args.items.length) {
      throw new Error("itemLocalIds must match items length");
    }
    if (args.participantLocalIds.length !== args.participants.length) {
      throw new Error("participantLocalIds must match participants length");
    }

    const subtotal = itemsSubtotal(args.items);
    const grandTotal = subtotal + args.taxAmount + args.tipAmount;

    let billId = args.billId;

    if (billId) {
      const bill = await loadBill(ctx, billId);
      if (!bill) {
        throw new Error("Bill not found");
      }

      const existingAssignments = await getBillAssignments(ctx, billId);
      for (const assignment of existingAssignments) {
        await ctx.db.delete(assignment._id);
      }

      const existingItems = await getBillItems(ctx, billId);
      for (const item of existingItems) {
        await ctx.db.delete(item._id);
      }

      const existingParticipants = await getBillParticipants(ctx, billId);
      for (const participant of existingParticipants) {
        await ctx.db.delete(participant._id);
      }

      await ctx.db.patch(billId, {
        title: args.title?.trim() || "Receipt",
        status: "confirmed",
        imageNames: [],
        receiptImageUrls: args.receiptImageUrls,
        currencyCode: args.receiptMetadata.currencyCode,
        fxSnapshot: args.receiptMetadata.fxSnapshot,
        taxForeignAmount: args.receiptMetadata.taxForeignAmount,
        tipForeignAmount: args.receiptMetadata.tipForeignAmount,
        grandTotal,
        taxAmount: args.taxAmount,
        tipAmount: args.tipAmount,
        taxTipMode: args.taxTipMode,
        updatedAt: timestamp,
        confirmedAt: bill.confirmedAt ?? timestamp,
      });
    } else {
      billId = await ctx.db.insert("bills", {
        ownerId: user._id,
        title: args.title?.trim() || "Receipt",
        sourceType: "parsed-receipt",
        status: "confirmed",
        imageNames: [],
        receiptImageUrls: args.receiptImageUrls,
        currencyCode: args.receiptMetadata.currencyCode,
        fxSnapshot: args.receiptMetadata.fxSnapshot,
        taxForeignAmount: args.receiptMetadata.taxForeignAmount,
        tipForeignAmount: args.receiptMetadata.tipForeignAmount,
        grandTotal,
        taxAmount: args.taxAmount,
        tipAmount: args.tipAmount,
        taxTipMode: args.taxTipMode,
        createdAt: timestamp,
        updatedAt: timestamp,
        confirmedAt: timestamp,
      });
    }

    const itemIdByLocalId = new Map<string, Id<"billItems">>();
    const insertedItemIds = await insertBillItems(ctx, billId, args.items);
    for (const [sortOrder, insertedId] of insertedItemIds.entries()) {
      itemIdByLocalId.set(args.itemLocalIds[sortOrder], insertedId);
    }

    const participantIdByLocalId = new Map<string, Id<"billParticipants">>();
    const insertedParticipantIds = await insertBillParticipants(
      ctx,
      billId,
      args.participants,
    );
    for (const [sortOrder, insertedId] of insertedParticipantIds.entries()) {
      participantIdByLocalId.set(args.participantLocalIds[sortOrder], insertedId);
    }

    for (const row of args.assignments) {
      const itemId = itemIdByLocalId.get(row.itemLocalId);
      if (!itemId) {
        throw new Error("Unknown item id in assignments");
      }

      for (const participantLocalId of row.participantLocalIds) {
        const participantId = participantIdByLocalId.get(participantLocalId);
        if (!participantId) {
          throw new Error("Unknown participant id in assignments");
        }

        await ctx.db.insert("billAssignments", {
          billId,
          itemId,
          participantId,
        });
      }
    }

    return { billId };
  },
});

export const saveBillAdjustments = mutation({
  args: {
    billId: v.id("bills"),
    taxAmount: v.number(),
    tipAmount: v.number(),
    taxTipMode: v.union(v.literal("proportional"), v.literal("equal")),
  },
  handler: async (ctx, args) => {
    const bill = await loadBill(ctx, args.billId);
    if (!bill) {
      throw new Error("Bill not found");
    }
    const items = await getBillItems(ctx, args.billId);
    const subtotal = itemsSubtotal(items);
    const grandTotal = subtotal + args.taxAmount + args.tipAmount;
    await ctx.db.patch(args.billId, {
      taxAmount: args.taxAmount,
      tipAmount: args.tipAmount,
      taxTipMode: args.taxTipMode,
      grandTotal,
      updatedAt: Date.now(),
    });
  },
});

export const saveParticipants = mutation({
  args: {
    billId: v.id("bills"),
    participants: v.array(
      v.object({
        name: v.string(),
        initials: v.string(),
        color: v.string(),
        isSelf: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const bill = await loadBill(ctx, args.billId);
    if (!bill) {
      throw new Error("Bill not found");
    }

    const existingParticipants = await getBillParticipants(ctx, args.billId);
    for (const participant of existingParticipants) {
      await ctx.db.delete(participant._id);
    }

    const existingAssignments = await getBillAssignments(ctx, args.billId);
    for (const assignment of existingAssignments) {
      await ctx.db.delete(assignment._id);
    }

    for (const [sortOrder, participant] of args.participants.entries()) {
      await ctx.db.insert("billParticipants", {
        billId: args.billId,
        name: participant.name,
        initials: participant.initials,
        color: participant.color,
        isSelf: participant.isSelf,
        sortOrder,
      });
    }

    await ctx.db.patch(args.billId, {
      updatedAt: Date.now(),
    });
  },
});

export const saveAssignments = mutation({
  args: {
    billId: v.id("bills"),
    assignments: v.record(v.string(), v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const bill = await loadBill(ctx, args.billId);
    if (!bill) {
      throw new Error("Bill not found");
    }

    const existingAssignments = await getBillAssignments(ctx, args.billId);
    for (const assignment of existingAssignments) {
      await ctx.db.delete(assignment._id);
    }

    for (const [itemId, participantIds] of Object.entries(args.assignments)) {
      for (const participantId of participantIds) {
        await ctx.db.insert("billAssignments", {
          billId: args.billId,
          itemId: itemId as Id<"billItems">,
          participantId: participantId as Id<"billParticipants">,
        });
      }
    }

    await ctx.db.patch(args.billId, {
      updatedAt: Date.now(),
    });
  },
});

export const confirmBill = mutation({
  args: {
    billId: v.id("bills"),
  },
  handler: async (ctx, args) => {
    const bill = await loadBill(ctx, args.billId);
    if (!bill) {
      throw new Error("Bill not found");
    }

    await ctx.db.patch(args.billId, {
      status: "confirmed",
      confirmedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const deleteDraftBill = mutation({
  args: {
    billId: v.id("bills"),
  },
  handler: async (ctx, args) => {
    const bill = await loadBill(ctx, args.billId);
    if (!bill) {
      throw new Error("Bill not found");
    }
    if (bill.status !== "draft") {
      throw new Error("Only drafts can be deleted");
    }
    await deleteBillCascade(ctx, args.billId);
  },
});

export const deleteExpiredDrafts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - DRAFT_TTL_MS;
    const stale = await ctx.db
      .query("bills")
      .withIndex("by_status_updated", (queryBuilder) =>
        queryBuilder.eq("status", "draft").lt("updatedAt", cutoff),
      )
      .collect();

    for (const bill of stale) {
      await deleteBillCascade(ctx, bill._id);
    }
  },
});

export const deleteExpiredDraftsForViewer = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireOwner(ctx);
    const cutoff = Date.now() - DRAFT_TTL_MS;
    const stale = await ctx.db
      .query("bills")
      .withIndex("by_status_updated", (queryBuilder) =>
        queryBuilder.eq("status", "draft").lt("updatedAt", cutoff),
      )
      .collect();

    let deletedCount = 0;
    for (const bill of stale) {
      if (bill.ownerId !== user._id) {
        continue;
      }
      await deleteBillCascade(ctx, bill._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});

export const getBill = query({
  args: {
    billId: v.id("bills"),
  },
  handler: async (ctx, args) => {
    const bill = await loadBillForViewer(ctx, args.billId);
    if (!bill) {
      return null;
    }

    const [participants, items, assignments] = await Promise.all([
      getBillParticipants(ctx, args.billId),
      getBillItems(ctx, args.billId),
      getBillAssignments(ctx, args.billId),
    ]);

    return billPayload(bill, participants, items, assignments);
  },
});
