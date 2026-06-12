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
