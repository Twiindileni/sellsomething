// Payment details for escrow purchases — set via .env (see client/.env.example)
const cellNumber =
  process.env.REACT_APP_PAYMENT_CELL
  || process.env.REACT_APP_PAYMENT_EASYWALLET
  || "+264 81 78 545 73";

export const PAYMENT = {
  cellNumber,
  /** @deprecated use cellNumber */
  easywallet: cellNumber,
  mobileMethods: ["Pay to Cell", "EasyWallet", "Blue Wallet"],
  bankName: process.env.REACT_APP_PAYMENT_BANK_NAME || "Sheka Investment CC",
  bank: process.env.REACT_APP_PAYMENT_BANK || "FNB",
  bankAccount: process.env.REACT_APP_PAYMENT_BANK_ACCOUNT || "62262406674",
};

/** How sellers tell admin to pay them after buyer confirms (escrow release) */
export const SELLER_PAYOUT_METHODS = [
  { id: "pay_to_cell", label: "Pay to Cell" },
  { id: "easywallet", label: "EasyWallet" },
  { id: "blue_wallet", label: "Blue Wallet" },
  { id: "bank_eft", label: "Bank EFT" },
];

export function sellerPayoutMethodLabel(id) {
  return SELLER_PAYOUT_METHODS.find((m) => m.id === id)?.label || id || "—";
}

export function sellerPayoutDetailsPlaceholder(method) {
  if (method === "bank_eft") {
    return "Account name, bank & number — e.g. John Doe, FNB 62262406674";
  }
  return "Mobile number — e.g. +264 81 123 4567";
}
