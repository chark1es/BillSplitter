type ForeignPricedItem = {
  foreignPrice: number;
  usdPrice: number;
};

type ReceiptTotalsInput = {
  items: ForeignPricedItem[];
  taxForeignAmount: number;
  tipForeignAmount: number;
  taxUsdAmount: number;
  tipUsdAmount: number;
  discountForeignAmount?: number;
  discountUsdAmount?: number;
};

export const calculateParsedReceiptSubtotalForeign = (
  receipt: Pick<ReceiptTotalsInput, "items">,
) => receipt.items.reduce((sum, item) => sum + item.foreignPrice, 0);

export const calculateParsedReceiptSubtotalUsd = (
  receipt: Pick<ReceiptTotalsInput, "items">,
) => receipt.items.reduce((sum, item) => sum + item.usdPrice, 0);

export const calculateParsedReceiptGrandTotalForeign = (
  receipt: Pick<
    ReceiptTotalsInput,
    | "items"
    | "taxForeignAmount"
    | "tipForeignAmount"
    | "discountForeignAmount"
  >,
) =>
  calculateParsedReceiptSubtotalForeign(receipt) +
  receipt.taxForeignAmount +
  receipt.tipForeignAmount -
  (receipt.discountForeignAmount ?? 0);

export const calculateParsedReceiptGrandTotalUsd = (
  receipt: Pick<
    ReceiptTotalsInput,
    "items" | "taxUsdAmount" | "tipUsdAmount" | "discountUsdAmount"
  >,
) =>
  calculateParsedReceiptSubtotalUsd(receipt) +
  receipt.taxUsdAmount +
  receipt.tipUsdAmount -
  (receipt.discountUsdAmount ?? 0);
