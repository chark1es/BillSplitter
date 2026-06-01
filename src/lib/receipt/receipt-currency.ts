export const isUsdReceipt = (currencyCode: string) =>
  currencyCode.toUpperCase() === "USD";

export const formatReceiptMoney = (
  amount: number,
  currencyCode: string,
  options?: { useDollarSign?: boolean },
) => {
  const formatted = amount.toFixed(2);
  if (isUsdReceipt(currencyCode)) {
    return options?.useDollarSign === false ? formatted : `$${formatted}`;
  }
  return `${formatted} ${currencyCode}`;
};
