import type { FxSnapshot } from "../types";

type CurrencyApiLatestResponse = {
  meta?: {
    last_updated_at?: string;
  };
  data?: Record<
    string,
    {
      code?: string;
      value?: number;
    }
  >;
};

type FrankfurterLatestResponse = {
  amount?: number;
  base?: string;
  date?: string;
  rates?: Record<string, number>;
};

const CURRENCY_API_URL = "https://api.currencyapi.com/v3/latest";
const FRANKFURTER_URL = "https://api.frankfurter.app/latest";

const normalizeCurrencyCode = (currencyCode: string) =>
  currencyCode.trim().toUpperCase();

const buildParitySnapshot = (currencyCode: string): FxSnapshot => {
  const now = new Date().toISOString();
  return {
    baseCurrency: "USD",
    currencyCode,
    date: now.slice(0, 10),
    foreignUnitsPerUsd: 1,
    lastUpdatedAt: now,
    rateSource: "parity",
  };
};

const fetchFromCurrencyApi = async (
  currencyCode: string,
): Promise<FxSnapshot | null> => {
  const apiKey = process.env.CURRENCY_API_KEY ?? process.env.CURRENCYAPI_KEY;
  if (!apiKey) {
    return null;
  }

  const url = new URL(CURRENCY_API_URL);
  url.searchParams.set("base_currency", "USD");
  url.searchParams.set("currencies", currencyCode);

  const response = await fetch(url.toString(), {
    headers: {
      apikey: apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`currencyapi returned ${response.status}`);
  }

  const data = (await response.json()) as CurrencyApiLatestResponse;
  const rate = data.data?.[currencyCode]?.value;
  if (!rate || rate <= 0) {
    throw new Error(`currencyapi did not return a rate for ${currencyCode}`);
  }

  const lastUpdatedAt = data.meta?.last_updated_at;
  return {
    baseCurrency: "USD",
    currencyCode,
    date: lastUpdatedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    foreignUnitsPerUsd: rate,
    lastUpdatedAt,
    rateSource: "currencyapi",
  };
};

const fetchFromFrankfurter = async (
  currencyCode: string,
): Promise<FxSnapshot> => {
  const url = new URL(FRANKFURTER_URL);
  url.searchParams.set("from", "USD");
  url.searchParams.set("to", currencyCode);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Frankfurter returned ${response.status}`);
  }

  const data = (await response.json()) as FrankfurterLatestResponse;
  const rate = data.rates?.[currencyCode];
  if (!rate || rate <= 0) {
    throw new Error(`Frankfurter did not return a rate for ${currencyCode}`);
  }

  return {
    baseCurrency: "USD",
    currencyCode,
    date: data.date ?? new Date().toISOString().slice(0, 10),
    foreignUnitsPerUsd: rate,
    rateSource: "frankfurter",
  };
};

export async function fetchUsdFxSnapshot(
  rawCurrencyCode: string,
): Promise<FxSnapshot> {
  const currencyCode = normalizeCurrencyCode(rawCurrencyCode || "USD");
  if (currencyCode === "USD") {
    return buildParitySnapshot(currencyCode);
  }

  const errors: string[] = [];

  try {
    const currencyApiSnapshot = await fetchFromCurrencyApi(currencyCode);
    if (currencyApiSnapshot) {
      return currencyApiSnapshot;
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "currencyapi failed");
  }

  try {
    return await fetchFromFrankfurter(currencyCode);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Frankfurter failed");
  }

  throw new Error(
    `Could not resolve live FX rate for ${currencyCode}${
      errors.length ? ` (${errors.join("; ")})` : ""
    }.`,
  );
}

export const convertForeignToUsd = (
  foreignAmount: number,
  fxSnapshot: Pick<FxSnapshot, "foreignUnitsPerUsd">,
) => Number((foreignAmount / fxSnapshot.foreignUnitsPerUsd).toFixed(2));

export const convertUsdToForeign = (
  usdAmount: number,
  fxSnapshot: Pick<FxSnapshot, "foreignUnitsPerUsd">,
) => Number((usdAmount * fxSnapshot.foreignUnitsPerUsd).toFixed(2));

type ParsedReceiptWithFx<TItem extends { foreignPrice: number; usdPrice: number }> = {
  fxSnapshot: FxSnapshot;
  items: TItem[];
  taxForeignAmount: number;
  tipForeignAmount: number;
  taxUsdAmount: number;
  tipUsdAmount: number;
};

export function applyFxSnapshotToParsedReceipt<
  TItem extends { foreignPrice: number; usdPrice: number },
  TParsed extends ParsedReceiptWithFx<TItem>,
>(parsedReceipt: TParsed, fxSnapshot: FxSnapshot): TParsed {
  return {
    ...parsedReceipt,
    fxSnapshot,
    items: parsedReceipt.items.map((item) => ({
      ...item,
      usdPrice: convertForeignToUsd(item.foreignPrice, fxSnapshot),
    })) as TItem[],
    taxUsdAmount: convertForeignToUsd(parsedReceipt.taxForeignAmount, fxSnapshot),
    tipUsdAmount: convertForeignToUsd(parsedReceipt.tipForeignAmount, fxSnapshot),
  };
}
