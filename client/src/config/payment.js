// Payment details for escrow purchases — set via .env (see client/.env.example)
export const PAYMENT = {
  easywallet: process.env.REACT_APP_PAYMENT_EASYWALLET || "+264 81 78 545 73",
  bankName: process.env.REACT_APP_PAYMENT_BANK_NAME || "Sell Something (Pty) Ltd",
  bank: process.env.REACT_APP_PAYMENT_BANK || "Bank Windhoek",
  bankAccount: process.env.REACT_APP_PAYMENT_BANK_ACCOUNT || "",
};
