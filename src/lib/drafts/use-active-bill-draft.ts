import { useCallback, useEffect, useMemo, useState } from "react";
import type { LocalBillDraft } from "./local-bill-draft";
import {
  LOCAL_BILL_DRAFT_STORAGE_KEY,
  createEmptyLocalBillDraft,
} from "./local-bill-draft";

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

  useEffect(() => {
    if (!draft) return;
    const handle = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          LOCAL_BILL_DRAFT_STORAGE_KEY,
          JSON.stringify(draft),
        );
      } catch {
        // Ignore write failures (private mode / quota exceeded).
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [draft]);

  const ensureDraft = useCallback(() => {
    setDraft((prev) => prev ?? createEmptyLocalBillDraft());
  }, []);

  const patchDraft = useCallback(
    (updater: (prev: LocalBillDraft) => LocalBillDraft) => {
      setDraft((prev) => {
        if (!prev) {
          return updater(createEmptyLocalBillDraft());
        }
        const next = updater(prev);
        return { ...next, updatedAt: Date.now() };
      });
    },
    [],
  );

  const replaceDraft = useCallback((next: LocalBillDraft) => {
    setDraft({ ...next, updatedAt: Date.now() });
  }, []);

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(LOCAL_BILL_DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }
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

