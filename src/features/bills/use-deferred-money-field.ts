import { useCallback, useEffect, useRef, useState } from "react";
import { formatOptionalMoneyInput } from "./bill-wizard-routing";

const DEFAULT_DEBOUNCE_MS = 400;

export type DeferredMoneyFieldBindings = {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
};

/**
 * Local string while typing; commits parsed amount on blur or after debounce.
 * Syncs from committedAmount only when the field is not focused.
 */
export function useDeferredMoneyField(options: {
  committedAmount: number;
  onCommit: (amount: number) => void;
  resetKey?: string | number;
  debounceMs?: number;
}): DeferredMoneyFieldBindings {
  const { committedAmount, onCommit, resetKey, debounceMs = DEFAULT_DEBOUNCE_MS } =
    options;
  const [value, setValue] = useState(() => formatOptionalMoneyInput(committedAmount));
  const focusedRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!focusedRef.current) {
      setValue(formatOptionalMoneyInput(committedAmount));
    }
  }, [committedAmount, resetKey]);

  const commit = useCallback(
    (raw: string) => {
      if (!raw.trim()) {
        onCommit(0);
        setValue("");
        return;
      }
      const next = Number(raw);
      if (!Number.isFinite(next)) {
        return;
      }
      onCommit(next);
      setValue(formatOptionalMoneyInput(next));
    },
    [onCommit],
  );

  const scheduleCommit = useCallback(
    (raw: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        if (focusedRef.current) {
          commit(raw);
        }
      }, debounceMs);
    },
    [commit, debounceMs],
  );

  const onChange = useCallback(
    (next: string) => {
      setValue(next);
      if (focusedRef.current) {
        scheduleCommit(next);
      }
    },
    [scheduleCommit],
  );

  const onFocus = useCallback(() => {
    focusedRef.current = true;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const onBlur = useCallback(() => {
    focusedRef.current = false;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    commit(value);
  }, [commit, value]);

  useEffect(
    () => () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    },
    [],
  );

  return { value, onChange, onFocus, onBlur };
}

export type DeferredFxMoneyPairBindings = {
  foreign: DeferredMoneyFieldBindings;
  usd: DeferredMoneyFieldBindings;
};

/**
 * Paired foreign/USD inputs; commits both sides on blur/debounce using FX rate.
 */
export function useDeferredFxMoneyPair(options: {
  foreignAmount: number;
  usdAmount: number;
  rate: number;
  onCommit: (foreign: number, usd: number) => void;
  resetKey?: string | number;
  debounceMs?: number;
}): DeferredFxMoneyPairBindings {
  const { foreignAmount, usdAmount, rate, onCommit, resetKey, debounceMs } = options;
  const editingSideRef = useRef<"foreign" | "usd" | null>(null);

  const commitForeign = useCallback(
    (foreign: number) => {
      const usd = rate > 0 ? Math.round((foreign / rate) * 100) / 100 : foreign;
      onCommit(foreign, usd);
    },
    [onCommit, rate],
  );

  const commitUsd = useCallback(
    (usd: number) => {
      const foreign = Math.round(usd * rate * 100) / 100;
      onCommit(foreign, usd);
    },
    [onCommit, rate],
  );

  const foreignField = useDeferredMoneyField({
    committedAmount: foreignAmount,
    onCommit: commitForeign,
    resetKey: `${resetKey}-foreign-${foreignAmount}`,
    debounceMs,
  });

  const usdField = useDeferredMoneyField({
    committedAmount: usdAmount,
    onCommit: commitUsd,
    resetKey: `${resetKey}-usd-${usdAmount}`,
    debounceMs,
  });

  const wrap = (
    side: "foreign" | "usd",
    field: DeferredMoneyFieldBindings,
  ): DeferredMoneyFieldBindings => ({
    value: field.value,
    onChange: (v) => {
      editingSideRef.current = side;
      field.onChange(v);
    },
    onFocus: () => {
      editingSideRef.current = side;
      field.onFocus();
    },
    onBlur: () => {
      field.onBlur();
      editingSideRef.current = null;
    },
  });

  return {
    foreign: wrap("foreign", foreignField),
    usd: wrap("usd", usdField),
  };
}
