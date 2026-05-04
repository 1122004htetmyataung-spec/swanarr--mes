import { create } from "zustand";

/** POS cart line — matches checkout payload. */
export type CartLine = {
  inventoryItemId: string;
  name: string;
  unitPrice: number;
  qty: number;
};

type CartState = {
  lines: CartLine[];
  branchId: string | null;
  discountAmount: number;
  taxPercent: number;
  paymentMethod: string;
  setBranchId: (branchId: string | null) => void;
  setDiscountAmount: (amount: number) => void;
  setTaxPercent: (percent: number) => void;
  setPaymentMethod: (method: string) => void;
  addLine: (line: CartLine) => void;
  updateQty: (inventoryItemId: string, qty: number) => void;
  removeLine: (inventoryItemId: string) => void;
  clearCart: () => void;
};

const initialCheckout = {
  discountAmount: 0,
  taxPercent: 0,
  paymentMethod: "CASH",
};

export const useCartStore = create<CartState>((set, get) => ({
  lines: [],
  branchId: null,
  ...initialCheckout,
  setBranchId: (branchId) => set({ branchId }),
  setDiscountAmount: (discountAmount) =>
    set({ discountAmount: Math.max(0, Number.isFinite(discountAmount) ? discountAmount : 0) }),
  setTaxPercent: (taxPercent) =>
    set({ taxPercent: Math.max(0, Number.isFinite(taxPercent) ? taxPercent : 0) }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  addLine: (line) => {
    const { lines } = get();
    const i = lines.findIndex((l) => l.inventoryItemId === line.inventoryItemId);
    if (i >= 0) {
      const next = [...lines];
      next[i] = {
        ...next[i],
        qty: next[i].qty + line.qty,
      };
      set({ lines: next });
      return;
    }
    set({ lines: [...lines, line] });
  },
  updateQty: (inventoryItemId, qty) =>
    set({
      lines: get().lines
        .map((l) =>
          l.inventoryItemId === inventoryItemId ? { ...l, qty: Math.max(0, qty) } : l
        )
        .filter((l) => l.qty > 0),
    }),
  removeLine: (inventoryItemId) =>
    set({ lines: get().lines.filter((l) => l.inventoryItemId !== inventoryItemId) }),
  clearCart: () =>
    set({
      lines: [],
      ...initialCheckout,
    }),
}));
