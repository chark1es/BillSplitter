export const RECEIPT_ITEM_SEEDS = [
  { name: "Wagyu Tartare", price: 28 },
  { name: "Truffle Fries", price: 16 },
  { name: "Grilled Branzino", price: 42 },
  { name: "Mushroom Risotto", price: 26 },
  { name: "Caesar Salad", price: 14 },
  { name: "Espresso Martini x3", price: 54 },
  { name: "Tiramisu", price: 15 },
  { name: "Sparkling Water x2", price: 12 },
] as const;

export const PARTICIPANT_OPTIONS = [
  { name: "You", initials: "ME", color: "#0f766e", isSelf: true },
  { name: "Alex", initials: "AK", color: "#1d4ed8", isSelf: false },
  { name: "Jordan", initials: "JL", color: "#b45309", isSelf: false },
  { name: "Sam", initials: "SR", color: "#be123c", isSelf: false },
  { name: "Riley", initials: "RM", color: "#4338ca", isSelf: false },
  { name: "Casey", initials: "CT", color: "#166534", isSelf: false },
] as const;

export const buildMockUploadName = (index: number) =>
  `receipt_part_${index + 1}.jpg`;
