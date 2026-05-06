"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader as Loader2, Minus, Package, Plus, ShoppingCart, Trash2, X, ChevronsRight, GripVertical } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import { useAuthUser } from "@/hooks/use-auth-user";
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

const CART_WIDTH_KEY = "pos-cart-width";
const CART_COLLAPSED_KEY = "pos-cart-collapsed";
const MIN_WIDTH = 260;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 320;

function loadCartWidth(): number {
  if (typeof window === "undefined") return DEFAULT_WIDTH;
  const saved = localStorage.getItem(CART_WIDTH_KEY);
  if (!saved) return DEFAULT_WIDTH;
  const n = Number(saved);
  return Number.isFinite(n) && n >= MIN_WIDTH && n <= MAX_WIDTH ? n : DEFAULT_WIDTH;
}

function loadCartCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CART_COLLAPSED_KEY) === "true";
}

export function PosView() {
  const locale = useLocaleStore((s) => s.locale);
  const user = useAuthUser();
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
  const [cartOpen, setCartOpen] = useState(false);
  const [cartWidth, setCartWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setCartWidth(loadCartWidth());
    setCollapsed(loadCartCollapsed());
    setHydrated(true);
  }, []);

  // Auto-open cart when first item is added
  const prevLineCountRef = useRef(0);
  useEffect(() => {
    if (lines.length > prevLineCountRef.current && lines.length === 1) {
      setCartOpen(true);
      setCollapsed(false);
    }
    prevLineCountRef.current = lines.length;
  }, [lines.length]);

  // Close cart when cleared after checkout
  useEffect(() => {
    if (lines.length === 0) {
      setCartOpen(false);
    }
  }, [lines.length]);

  // Persist width
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(CART_WIDTH_KEY, String(cartWidth));
  }, [cartWidth, hydrated]);

  // Persist collapsed
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(CART_COLLAPSED_KEY, String(collapsed));
  }, [collapsed, hydrated]);

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

  // Resize handlers
  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      resizingRef.current = true;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      startXRef.current = clientX;
      startWidthRef.current = cartWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [cartWidth]
  );

  useEffect(() => {
    const handleMove = (clientX: number) => {
      if (!resizingRef.current) return;
      // Dragging left edge: moving left = wider, moving right = narrower
      const delta = startXRef.current - clientX;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + delta));
      setCartWidth(next);
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);

    const handleUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchend", handleUp);
    };
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  if (!user) return null;

  if (user.role === USER_ROLE.TECHNICIAN) {
    return null;
  }

  const drawerWidth = collapsed ? 48 : cartWidth;

  return (
    <div className="relative">
      <div className="mx-auto max-w-[1400px]">
        {/* Floating cart button — only when cart is closed */}
        {lines.length > 0 && !cartOpen && (
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className={cn(
              "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-xl",
              "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground",
              "transition-all duration-200 hover:scale-110 hover:shadow-2xl active:scale-95",
              "md:bottom-8 md:right-8"
            )}
            aria-label="Open cart"
          >
            <ShoppingCart className="size-6" aria-hidden />
            <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white shadow-md">
              {lines.length}
            </span>
          </button>
        )}

        {/* Cart overlay backdrop */}
        {cartOpen && !collapsed && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200"
            onClick={() => setCartOpen(false)}
            aria-hidden
          />
        )}

        {/* Cart drawer */}
        <div
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex transition-all duration-200 ease-out",
            cartOpen ? "translate-x-0" : "translate-x-full"
          )}
          style={{ width: drawerWidth }}
        >
          {/* Resize handle on left edge */}
          {cartOpen && !collapsed && (
            <div
              onMouseDown={handleResizeStart}
              onTouchStart={handleResizeStart}
              className={cn(
                "group relative -left-1 top-0 z-10 flex w-3 cursor-col-resize items-center justify-center",
                "hover:bg-primary/10 active:bg-primary/20"
              )}
            >
              <GripVertical className="size-3 text-muted-foreground/50 transition-colors group-hover:text-primary" />
            </div>
          )}

          {/* Collapsed tab */}
          {cartOpen && collapsed && (
            <button
              type="button"
              onClick={toggleCollapse}
              className={cn(
                "flex h-full w-full flex-col items-center gap-2 pt-4",
                "bg-white/95 shadow-2xl backdrop-blur-md border-l border-white/50"
              )}
              aria-label="Expand cart"
            >
              <ShoppingCart className="size-5 text-primary" aria-hidden />
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {lines.length}
              </span>
              <ChevronsRight className="size-4 text-muted-foreground" />
            </button>
          )}

          {/* Full cart panel */}
          {cartOpen && !collapsed && (
            <div className="flex h-full min-w-0 flex-1 flex-col border-l border-white/50 bg-white/95 shadow-2xl backdrop-blur-md">
              {/* Cart header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="size-5 text-primary" aria-hidden />
                  <h2 className="text-lg font-bold tracking-tight">Cart</h2>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {lines.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-xl"
                    onClick={toggleCollapse}
                    aria-label="Collapse cart"
                    title="Collapse cart"
                  >
                    <ChevronsRight className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-xl"
                    onClick={() => setCartOpen(false)}
                    aria-label="Close cart"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Cart items */}
              <div className="flex-1 overflow-y-auto p-4">
                {lines.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-border bg-muted/30 px-3 py-8 text-center text-sm text-muted-foreground">
                    No items in cart
                  </p>
                ) : (
                  <div className="space-y-2">
                    {lines.map((line) => {
                      const max = stockById.get(line.inventoryItemId) ?? line.qty;
                      return (
                        <div
                          key={line.inventoryItemId}
                          className="flex gap-3 rounded-2xl border border-white/60 bg-white/70 p-3 shadow-sm backdrop-blur-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{line.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatMmk(line.unitPrice)} each
                            </p>
                            <p className="mt-1 text-sm font-bold text-primary">
                              {formatMmk(line.unitPrice * line.qty)}
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
                              className="h-7 text-destructive hover:bg-destructive/10"
                              onClick={() => removeLine(line.inventoryItemId)}
                            >
                              <Trash2 className="mr-1 size-3.5" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cart footer */}
              <div className="border-t border-border p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Discount (Ks)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      value={discountAmount || ""}
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      className="rounded-xl bg-white/80"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Tax (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={taxPercent || ""}
                      onChange={(e) => setTaxPercent(Number(e.target.value))}
                      className="rounded-xl bg-white/80"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatMmk(totals.subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>After discount</span>
                      <span>{formatMmk(totals.afterDiscount)}</span>
                    </div>
                  )}
                  {taxPercent > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax ({taxPercent}%)</span>
                      <span>{formatMmk(totals.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-foreground">
                    <span>Total</span>
                    <span>{formatMmk(totals.grandTotal)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Payment method</Label>
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
          )}
        </div>

        {/* Product grid */}
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
              No products match this branch or search.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                          sizes="(max-width: 768px) 100vw, 25vw"
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
                      {inCart > 0 && (
                        <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-md">
                          {inCart}
                        </span>
                      )}
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
        </div>
      </div>
    </div>
  );
}
