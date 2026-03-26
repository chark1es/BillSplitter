import { createServerFn } from "@tanstack/react-start";
import { api } from "../../../convex/_generated/api";
import type { ParsedReceiptPayload } from "../types";
import { getServerAuth } from "../auth/server-auth";
import { getServerEnv, hasConfiguredConvex } from "../env";

type FrankfurterLatest = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};

async function fetchUsdRatesContext(): Promise<{
  base: string;
  date: string;
  ratesToUsd: Record<string, number>;
  note: string;
}> {
  try {
    const response = await fetch("https://api.frankfurter.app/latest?from=USD");
    const data = (await response.json()) as FrankfurterLatest;
    return {
      base: data.base,
      date: data.date,
      ratesToUsd: data.rates,
      note: "rates are foreign currency units per 1 USD.",
    };
  } catch {
    return {
      base: "USD",
      date: new Date().toISOString().slice(0, 10),
      ratesToUsd: {},
      note: "rates unavailable",
    };
  }
}

const defaultModel = "google/gemini-3.1-flash-lite-preview";

export const parseReceiptFromUrls = createServerFn({ method: "POST" })
  .inputValidator((data: { imageUrls: string[] }) => data)
  .handler(async ({ data }): Promise<ParsedReceiptPayload> => {
    const env = getServerEnv();
    if (!hasConfiguredConvex(env.convexUrl) || !hasConfiguredConvex(env.convexSiteUrl)) {
      throw new Error("Not configured");
    }

    const auth = getServerAuth();
    const viewer = await auth.fetchAuthQuery(api.auth.viewer, {});
    if (!viewer?.allowed) {
      throw new Error("Unauthorized");
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not set");
    }

    const model = process.env.RECEIPT_MODEL_ID ?? defaultModel;
    const ratesContext = await fetchUsdRatesContext();
    const ratesContextJson = JSON.stringify({
      base: ratesContext.base,
      date: ratesContext.date,
      ratesToUsd: ratesContext.ratesToUsd,
      note: ratesContext.note,
    });

    const system = `You are a receipt parser. Output strictly valid JSON matching this shape:
{
  "title": string (short, English),
  "detectedCurrencyCode": string (ISO 4217, uppercase),
  "items": [
    {
      "foreignName": string (verbatim receipt line item name, non-English ok),
      "translatedName": string (English display name),
      "foreignPrice": number (numeric line total in detectedCurrencyCode, 2 decimals)
    }
  ],
  "taxForeignAmount": number (numeric, detectedCurrencyCode, 2 decimals),
  "tipForeignAmount": number (numeric, detectedCurrencyCode, 2 decimals; 0 if none),
  "taxTipMode": "proportional" | "equal",
  "confidence": number (0-1),
  "notes": string (brief)
}
Rules:
- Use the detected currency code as the unit for every monetary value.
- Output raw amounts in detectedCurrencyCode only. Do NOT convert amounts to USD in the model output.
- Use "foreignName" verbatim from the receipt. Use "translatedName" as the English display name.
- Item prices are line totals before tax/tip unless the receipt only shows one bundled total (then approximate best-effort line items).
- If tax or tip cannot be separated, put 0 in taxForeignAmount/tipForeignAmount and fold into items only if clearly itemized.
- taxTipMode: prefer "proportional" for restaurant-style splits unless the receipt suggests an even service charge for everyone.`;

    const userContent = `Exchange context (USD-focused; server will convert foreign->USD using the snapshot):
${ratesContextJson}

Parse the receipt image(s). Return JSON only.`;

    const imageParts = data.imageUrls.map((url) => ({
      type: "image_url" as const,
      image_url: { url, detail: "high" as const },
    }));

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.VITE_APP_URL ??
          process.env.BETTER_AUTH_URL ??
          "http://localhost:3000",
        "X-Title": "FairShare",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [{ type: "text", text: userContent }, ...imageParts],
          },
        ],
        response_format: { type: "json_object" },
        reasoning: { effort: "medium" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${errText.slice(0, 400)}`);
    }

    const completion = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = completion.choices?.[0]?.message?.content;
    if (!raw) {
      throw new Error("Empty model response");
    }

    const parsed = JSON.parse(raw) as {
      title?: string;
      detectedCurrencyCode?: string;
      items?: Array<{
        foreignName: string;
        translatedName: string;
        foreignPrice: number;
      }>;
      taxForeignAmount?: number;
      tipForeignAmount?: number;
      taxTipMode?: "proportional" | "equal";
      confidence?: number;
      notes?: string;
    };

    const currencyCode = String(
      parsed.detectedCurrencyCode ?? "USD",
    ).toUpperCase();

    const foreignUnitsPerUsd =
      currencyCode === "USD"
        ? 1
        : ratesContext.ratesToUsd[currencyCode];

    if (!foreignUnitsPerUsd || foreignUnitsPerUsd <= 0) {
      throw new Error(`Could not resolve live FX rate for ${currencyCode}.`);
    }

    const toUsd = (foreignAmount: number) =>
      Number((foreignAmount / foreignUnitsPerUsd).toFixed(2));

    const items = (parsed.items ?? []).map((item, index) => {
      const foreignName = String(item.foreignName ?? `Item ${index + 1}`);
      const translatedName = String(
        item.translatedName ?? item.foreignName ?? `Item ${index + 1}`,
      );
      const foreignPrice = Number(item.foreignPrice ?? 0);

      return {
        foreignName,
        translatedName,
        foreignPrice: Number(foreignPrice.toFixed(2)),
        usdPrice: toUsd(foreignPrice),
      };
    });

    const taxForeignAmount = Number(parsed.taxForeignAmount ?? 0);
    const tipForeignAmount = Number(parsed.tipForeignAmount ?? 0);

    return {
      title: parsed.title,
      currencyCode,
      fxSnapshot: {
        baseCurrency: "USD",
        currencyCode,
        date: ratesContext.date,
        foreignUnitsPerUsd,
      },
      items,
      taxForeignAmount: Number(taxForeignAmount.toFixed(2)),
      tipForeignAmount: Number(tipForeignAmount.toFixed(2)),
      taxUsdAmount: toUsd(taxForeignAmount),
      tipUsdAmount: toUsd(tipForeignAmount),
      taxTipMode: parsed.taxTipMode === "equal" ? "equal" : "proportional",
      confidence:
        typeof parsed.confidence === "number" ? parsed.confidence : undefined,
      notes: parsed.notes ? String(parsed.notes) : undefined,
    };
  });
