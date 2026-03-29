import { useCallback, useEffect, useMemo, useState } from "react";
import type { LocalBillDraft } from "./local-bill-draft";
import {
  LOCAL_BILL_DRAFT_STORAGE_KEY,
  createEmptyLocalBillDraft,
} from "./local-bill-draft";

const writeDraftToStorage = (draft: LocalBillDraft | null) => {
  try {
    if (!draft) {
      window.localStorage.removeItem(LOCAL_BILL_DRAFT_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(LOCAL_BILL_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Ignore write failures (private mode / quota exceeded).
  }
};

export function useActiveBillDraft() {
  const [draft, setDraft] = useState<LocalBillDraft | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LOCAL_BILL_DRAFT_STORAGE_KEY);
      if (!raw) {
        setDraft(null);
        setHydrated(true);
        return;
      }
      const parsed = JSON.parse(raw) as LocalBillDraft;
      setDraft(parsed);
      setHydrated(true);
    } catch {
      // If parsing fails, fall back to empty rather than crashing the wizard.
      setDraft(null);
      setHydrated(true);
    }
  }, []);

  const ensureDraft = useCallback(() => {
    setDraft((prev) => {
      const next = prev ?? createEmptyLocalBillDraft();
      writeDraftToStorage(next);
      return next;
    });
  }, []);

  const patchDraft = useCallback(
    (updater: (prev: LocalBillDraft) => LocalBillDraft) => {
      setDraft((prev) => {
        const base = prev ?? createEmptyLocalBillDraft();
        const next = { ...updater(base), updatedAt: Date.now() };
        writeDraftToStorage(next);
        return next;
      });
    },
    [],
  );

  const replaceDraft = useCallback((next: LocalBillDraft) => {
    const synced = { ...next, updatedAt: Date.now() };
    writeDraftToStorage(synced);
    setDraft(synced);
  }, []);

  const clearDraft = useCallback(() => {
    writeDraftToStorage(null);
    setDraft(null);
  }, []);

  const debug = useMemo(
    () => ({
      storageKey: LOCAL_BILL_DRAFT_STORAGE_KEY,
    }),
    [],
  );

  return { draft, patchDraft, replaceDraft, clearDraft, ensureDraft, hydrated, debug };
}
