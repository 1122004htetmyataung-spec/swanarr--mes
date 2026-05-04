"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Minus,
  Package,
  Plus,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAYMENT_METHOD, USER_ROLE } from "@/lib/db-enums";
import { formatMmk } from "@/lib/format-mmk";
import { paymentLabel } from "@/lib/i18n/payments";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { useLocaleStore } from "@/stores/locale-store";

export type InventoryRow = {
  id: string;
  branchId: string;
  category: string;
  name: string;
  brand: string;
  model: string;
  imeiSerial: string | null;
  stockQty: number;
  salePrice: number;
  imageUrl: string | null;
};

async function fetchInventory(branchId: string): Promise<InventoryRow[]> {
  const res = await fetch(`/api/inventory?branchId=${encodeURIComponent(branchId)}`);
  if (!res.ok) throw new Error("Failed to load inventory");
  const data = (await res.json()) as { items: InventoryRow[] };
  return data.items;
}

const PAYMENT_CHIPS: Array<{
  id: (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];
  className: string;
}> = [
  {
    id: PAYMENT_METHOD.CASH,
    className:
      "border-transparent bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-md",
  },
  {
    id: PAYMENT_METHOD.KBZPAY,
    className:
      "border-transparent bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-950 shadow-md",
  },
  {
    id: PAYMENT_METHOD.WAVEPAY,
    className:
      "border-transparent bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-md",
  },
  {
    id: PAYMENT_METHOD.AYAPAY,
    className:
      "border-transparent bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-md",
  },
  {
    id: PAYMENT_METHOD.BANK,
    className:
      "border-transparent bg-gradient-to-br from-sky-600 to-blue-800 text-white shadow-md",
  },
  {
    id: PAYMENT_METHOD.CREDIT,
    className:
      "border border-destructive/40 bg-gradient-to-br from-rose-600 to-red-700 text-white shadow-md",
  },
];

function computeTotals(
  lines: { qty: number; unitPrice: number }[],
  discountAmount: number,
  taxPercent: number
) {
  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const taxAmount = afterDiscount * (taxPercent / 100);
  const grandTotal = afterDiscount + taxAmount;
  return { subtotal, afterDiscount, taxAmount, grandTotal };
}

export function PosView() {
  const locale = useLocaleStore((s) => s.locale);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const lines = useCartStore((s) => s.lines);
  const cartBranchId = useCartStore((s) => s.branchId);
  const discountAmount = useCartStore((s) => s.discountAmount);
  const taxPercent = useCartStore((s) => s.taxPercent);
  const paymentMethod = useCartStore((s) => s.paymentMethod);
  const setCartBranch = useCartStore((s) => s.setBranchId);
  const setDiscountAmount = useCartStore((s) => s.setDiscountAmount);
  const setTaxPercent = useCartStore((s) => s.setTaxPercent);
  const setPaymentMethod = useCartStore((s) => s.setPaymentMethod);
  const addLine = useCartStore((s) => s.addLine);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeLine = useCartStore((s) => s.removeLine);
  const clearCart = useCartStore((s) => s.clearCart);

  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user?.branchId) return;
    if (cartBranchId !== user.branchId) {
      clearCart();
      setCartBranch(user.branchId);
    }
  }, [user?.branchId, cartBranchId, clearCart, setCartBranch]);

  const branchId = user?.branchId ?? "";

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ["inventory", branchId],
    queryFn: () => fetchInventory(branchId),
    enabled: Boolean(branchId) && user?.role !== USER_ROLE.TECHNICIAN,
  });

  const stockById = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of inventory) {
      m.set(row.id, row.stockQty);
    }
    return m;
  }, [inventory]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inventory;
    return inventory.filter((row) => {
      const hay = `${row.name} ${row.brand} ${row.model} ${row.category}`.toLowerCase();
      return hay.includes(q);
    });
  }, [inventory, search]);

  const totals = useMemo(
    () => computeTotals(lines, discountAmount, taxPercent),
    [lines, discountAmount, taxPercent]
  );

  const addProduct = useCallback(
    (row: InventoryRow) => {
      const inCart = lines.find((l) => l.inventoryItemId === row.id)?.qty ?? 0;
      const stock = stockById.get(row.id) ?? 0;
      if (inCart + 1 > stock) {
        return;
      }
      addLine({
        inventoryItemId: row.id,
        name: row.name,
        unitPrice: row.salePrice,
        qty: 1,
      });
    },
    [addLine, lines, stockById]
  );

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: user.branchId,
          userId: user.id,
          paymentMethod,
          discount: discountAmount,
          taxPercent,
          items: lines.map((l) => ({
            inventoryId: l.inventoryItemId,
            qty: l.qty,
            price: l.unitPrice,
          })),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      return data;
    },
    onSuccess: async () => {
      clearCart();
      await queryClient.invalidateQueries({ queryKey: ["inventory", branchId] });
    },
  });

  const renderCartPanel = (
    idPrefix: string,
    opts?: { showHeading?: boolean }
  ) => (
    <div className="flex h-full flex-col gap-4">
      {opts?.showHeading === false ? null : (
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold tracking-tight">Cart</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {lines.length}
          </span>
        </div>
      )}

      <div className="min-h-[120px] flex-1 space-y-2 overflow-y-auto pr-1">
        {lines.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-muted/30 px-3 py-8 text-center text-sm text-muted-foreground">
            No items
          </p>
        ) : (
          lines.map((line) => {
            const max = stockById.get(line.inventoryItemId) ?? line.qty;
            return (
              <div
                key={line.inventoryItemId}
                className="flex gap-2 rounded-2xl border border-white/60 bg-white/70 p-2 shadow-sm backdrop-blur-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{line.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatMmk(line.unitPrice)} × {line.qty}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-8 rounded-xl"
                      disabled={line.qty <= 1}
                      onClick={() => updateQty(line.inventoryItemId, line.qty - 1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="w-8 text-center text-sm font-semibold">{line.qty}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-8 rounded-xl"
                      disabled={line.qty >= max}
                      onClick={() => updateQty(line.inventoryItemId, line.qty + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-destructive hover:bg-destructive/10"
                    onClick={() => removeLine(line.inventoryItemId)}
                  >
                    <Trash2 className="mr-1 size-4" />
                    Remove
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-white/50 bg-white/60 p-3 backdrop-blur-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`${idPrefix}-discount`}>Discount</Label>
            <Input
              id={`${idPrefix}-discount`}
              type="number"
              min={0}
              step={100}
              value={discountAmount || ""}
              onChange={(e) => setDiscountAmount(Number(e.target.value))}
              className="rounded-xl bg-white/80"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${idPrefix}-tax`}>Tax (%)</Label>
            <Input
              id={`${idPrefix}-tax`}
              type="number"
              min={0}
              step={0.5}
              value={taxPercent || ""}
              onChange={(e) => setTaxPercent(Number(e.target.value))}
              className="rounded-xl bg-white/80"
            />
          </div>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatMmk(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-foreground">
            <span>Total</span>
            <span>{formatMmk(totals.grandTotal)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {PAYMENT_CHIPS.map(({ id, className }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPaymentMethod(id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                  "hover:scale-105 active:scale-95",
                  className,
                  paymentMethod === id
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "opacity-90 hover:opacity-100"
                )}
              >
                {paymentLabel(locale, id)}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="button"
          disabled={
            lines.length === 0 || checkoutMutation.isPending || totals.grandTotal <= 0
          }
          className={cn(
            "h-12 w-full rounded-2xl text-base font-semibold shadow-lg transition-all duration-200",
            "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white",
            "hover:from-emerald-500 hover:via-teal-500 hover:to-emerald-600 hover:shadow-xl",
            "active:scale-95 disabled:opacity-50"
          )}
          onClick={() => checkoutMutation.mutate()}
        >
          {checkoutMutation.isPending ? (
            <>
              <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />
              Processing...
            </>
          ) : (
            "Checkout"
          )}
        </Button>
      </div>
    </div>
  );

  if (!user) return null;

  if (user.role === USER_ROLE.TECHNICIAN) {
    return null;
  }

  return (
    <div className="relative">
      <div className="mx-auto grid max-w-[1400px] gap-4 md:grid-cols-[1fr_360px] md:items-start">
        <div className="space-y-4">
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 rounded-2xl border-input bg-white/75 pl-3 shadow-md backdrop-blur-sm"
          />

          {isLoading ? (
            <div className="flex justify-center py-16 text-muted-foreground">
              <Loader2 className="size-8 animate-spin" aria-hidden />
            </div>
          ) : filtered.length === 0 ? (
            <p className="rounded-3xl border border-dashed bg-muted/30 py-12 text-center text-sm text-muted-foreground">
              {t.pos_no_products}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((row) => {
                const inCart = lines.find((l) => l.inventoryItemId === row.id)?.qty ?? 0;
                const canAdd = row.stockQty > inCart;
                return (
                  <Card
                    key={row.id}
                    className={cn(
                      "overflow-hidden rounded-3xl border-white/50 bg-white/80 shadow-glass backdrop-blur-sm",
                      "transition-all duration-200 hover:scale-[1.02] hover:shadow-glass-lg"
                    )}
                  >
                    <div className="relative aspect-square bg-gradient-to-br from-slate-100 to-blue-50/80">
                      {row.imageUrl ? (
                        <Image
                          src={row.imageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 33vw"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-primary/35">
                          <Package className="size-16" aria-hidden />
                        </div>
                      )}
                      <span className="absolute bottom-2 left-2 rounded-xl bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        {row.category.replace(/_/g, " ")}
                      </span>
                    </div>
                    <CardContent className="space-y-2 p-4">
                      <div>
                        <p className="line-clamp-2 font-semibold leading-snug">{row.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[row.brand, row.model].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-lg font-bold text-primary">
                            {formatMmk(row.salePrice)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Stock: {row.stockQty}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-2xl"
                          disabled={!canAdd || row.stockQty <= 0}
                          onClick={() => addProduct(row)}
                        >
                          <Plus className="mr-1 size-4" aria-hidden />
                          Add
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="rounded-3xl border border-white/50 bg-white/85 p-4 shadow-glass-lg backdrop-blur-md md:hidden">
            {renderCartPanel("mob", { showHeading: false })}
          </div>
        </div>

        <aside
          className={cn(
            "sticky top-20 hidden max-h-[calc(100vh-6rem)] overflow-y-auto md:block",
            "rounded-3xl border border-white/50 bg-white/85 p-4 shadow-glass-lg backdrop-blur-md"
          )}
        >
          {renderCartPanel("desk")}
        </aside>
      </div>
    </div>
  );
}
