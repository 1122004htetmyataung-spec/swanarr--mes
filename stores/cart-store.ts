import { create } from "zustand";
import { PAYMENT_METHOD } from "@/lib/db-enums";

/** POS cart line — supports both InventoryItem (bulk) and ProductInstance (tracked by serial) */
export type CartLine = {
  productInstanceId?: string; // For individually tracked items
  inventoryItemId?: string; // For bulk items (backward compatibility)
  serialNumber?: string; // For display/reference
  name: string;
  unitPrice: number;
  qty: number;
};

/** Payment entry for split payment support */
export type PaymentEntry = {
  id: string;
  method: (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];
  amount: number;
  reference?: string;
};

type DiscountType = "FIXED" | "PERCENTAGE";

type CartState = {
  lines: CartLine[];
  payments: PaymentEntry[]; // Split payments
  branchId: string | null;
  customerId: string | null;
  discountType: DiscountType;
  discountValue: number;
  taxPercent: number;
  paymentMethod: (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];
  
  setBranchId: (branchId: string | null) => void;
  setCustomerId: (customerId: string | null) => void;
  setDiscount: (value: number, type: DiscountType) => void;
  setTaxPercent: (percent: number) => void;
  setPaymentMethod: (method: (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD]) => void;
  addLine: (line: CartLine) => void;
  updateQty: (id: string, qty: number) => void;
  removeLine: (id: string) => void;
  addPayment: (payment: PaymentEntry) => void;
  updatePayment: (paymentId: string, amount: number) => void;
  removePayment: (paymentId: string) => void;
  clearPayments: () => void;
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTaxAmount: () => number;
  getGrandTotal: () => number;
  getRemainingAmount: () => number;
  clearCart: () => void;
};

const initialCheckout = {
  discountType: "FIXED" as const,
  discountValue: 0,
  taxPercent: 0,
  paymentMethod: PAYMENT_METHOD.CASH,
};

export const useCartStore = create<CartState>((set, get) => ({
  lines: [],
  payments: [],
  branchId: null,
  customerId: null,
  ...initialCheckout,

  setBranchId: (branchId) => set({ branchId }),
  setCustomerId: (customerId) => set({ customerId }),

  setDiscount: (value, type) =>
    set({
      discountType: type,
      discountValue: Math.max(0, Number.isFinite(value) ? value : 0),
    }),

  setTaxPercent: (taxPercent) =>
    set({ taxPercent: Math.max(0, Number.isFinite(taxPercent) ? taxPercent : 0) }),

  setPaymentMethod: (paymentMethod) =>
    set({ paymentMethod }),

  addLine: (line) => {
    const { lines } = get();
    const lineId = line.productInstanceId || line.inventoryItemId;
    
    // ProductInstances should never duplicate (1 instance = 1 qty)
    if (line.productInstanceId) {
      const exists = lines.find((l) => l.productInstanceId === line.productInstanceId);
      if (exists) return; // Already in cart
      set({ lines: [...lines, line] });
      return;
    }

    // InventoryItems can have qty > 1
    const existingIdx = lines.findIndex((l) => l.inventoryItemId === lineId);
    if (existingIdx >= 0) {
      const next = [...lines];
      next[existingIdx] = {
        ...next[existingIdx],
        qty: next[existingIdx].qty + line.qty,
      };
      set({ lines: next });
      return;
    }

    set({ lines: [...lines, line] });
  },

  updateQty: (id, qty) =>
    set({
      lines: get()
        .lines.map((l) => {
          const lineId = l.productInstanceId || l.inventoryItemId;
          return lineId === id ? { ...l, qty: Math.max(0, qty) } : l;
        })
        .filter((l) => l.qty > 0),
    }),

  removeLine: (id) =>
    set({
      lines: get().lines.filter((l) => {
        const lineId = l.productInstanceId || l.inventoryItemId;
        return lineId !== id;
      }),
    }),

  addPayment: (payment) => {
    set({ payments: [...get().payments, payment] });
  },

  updatePayment: (paymentId, amount) => {
    set({
      payments: get().payments.map((p) =>
        p.id === paymentId ? { ...p, amount: Math.max(0, amount) } : p
      ),
    });
  },

  removePayment: (paymentId) => {
    set({
      payments: get().payments.filter((p) => p.id !== paymentId),
    });
  },

  clearPayments: () => {
    set({ payments: [] });
  },

  getSubtotal: () => {
    return get().lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
  },

  getDiscountAmount: () => {
    const subtotal = get().getSubtotal();
    const { discountType, discountValue } = get();
    return discountType === "PERCENTAGE"
      ? (subtotal * discountValue) / 100
      : discountValue;
  },

  getTaxAmount: () => {
    const subtotal = get().getSubtotal();
    const discount = get().getDiscountAmount();
    const taxableAmount = Math.max(0, subtotal - discount);
    return (taxableAmount * get().taxPercent) / 100;
  },

  getGrandTotal: () => {
    const subtotal = get().getSubtotal();
    const discount = get().getDiscountAmount();
    const tax = get().getTaxAmount();
    return Math.max(0, subtotal - discount + tax);
  },

  getRemainingAmount: () => {
    const total = get().getGrandTotal();
    const paid = get().payments.reduce((sum, p) => sum + p.amount, 0);
    return Math.max(0, total - paid);
  },

  clearCart: () =>
    set({
      lines: [],
      payments: [],
      customerId: null,
      ...initialCheckout,
    }),
}));
