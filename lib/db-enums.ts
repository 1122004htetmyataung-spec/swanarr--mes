/** Valid DB string values (SQLite stores plain strings; use these in forms & APIs). */
export const USER_ROLE = {
  OWNER: "OWNER",
  MANAGER: "MANAGER",
  STAFF: "STAFF",
  TECHNICIAN: "TECHNICIAN",
} as const;

export const PAYMENT_METHOD = {
  CASH: "CASH",
  KBZPAY: "KBZPAY",
  WAVEPAY: "WAVEPAY",
  AYAPAY: "AYAPAY",
  BANK: "BANK",
  CREDIT: "CREDIT",
} as const;

export const SALE_STATUS = { PAID: "PAID", CREDIT: "CREDIT" } as const;

export const TICKET_STATUS = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
  DELIVERED: "DELIVERED",
} as const;

export const PRICE_TYPE = { FIXED: "FIXED", ESTIMATE: "ESTIMATE" } as const;

export const INVENTORY_CATEGORY = {
  NEW_PHONE: "NEW_PHONE",
  USED_PHONE: "USED_PHONE",
  USED_LAPTOP: "USED_LAPTOP",
  CCTV: "CCTV",
  CCTV_ACC: "CCTV_ACC",
  OTHER: "OTHER",
} as const;

export const EXPENSE_CATEGORY = {
  UTILITIES: "UTILITIES",
  SALARY: "SALARY",
  RENT: "RENT",
  SUPPLIER: "SUPPLIER",
  TRANSPORT: "TRANSPORT",
  OTHER: "OTHER",
} as const;

export const PHOTO_TYPE = { BEFORE: "BEFORE", AFTER: "AFTER" } as const;
