'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Trash2,
  X,
  ChevronsRight,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { USER_ROLE } from '@/lib/db-enums';
import { formatMmk } from '@/lib/format-mmk';
import { paymentLabel } from '@/lib/i18n/payments';
import { cn } from '@/lib/utils';
import { useAuthUser } from '@/hooks/use-auth-user';
import { useScanner } from '@/hooks/use-scanner';
import { useCartStore, CartLine, PaymentEntry } from '@/stores/cart-store';
import { useLocaleStore } from '@/stores/locale-store';
import Receipt from '@/components/pos/receipt';

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
  if (!res.ok) throw new Error('Failed to load inventory');
  const data = (await res.json()) as { items: InventoryRow[] };
  return data.items;
}

const PAYMENT_METHODS = [
  { id: 'CASH', label: 'Cash', color: 'from-emerald-600 to-emerald-700' },
  { id: 'KBZPAY', label: 'KBZ Pay', color: 'from-red-600 to-red-700' },
  { id: 'WAVEPAY', label: 'Wave Pay', color: 'from-blue-600 to-blue-700' },
  { id: 'AYAPAY', label: 'Aya Pay', color: 'from-purple-600 to-purple-700' },
  { id: 'BANK', label: 'Bank', color: 'from-slate-600 to-slate-700' },
  { id: 'CREDIT', label: 'Credit', color: 'from-amber-600 to-amber-700' },
];

export default function POSView() {
  const { user, branchId } = useAuthUser();
  const cart = useCartStore();
  const { setLocale } = useLocaleStore();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [scannerInput, setScannerInput] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);

  const cartDrawerRef = useRef<HTMLDivElement>(null);

  // Query inventory
  const { data: inventory = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory', branchId],
    queryFn: () => (branchId ? fetchInventory(branchId) : Promise.reject('No branch')),
    enabled: !!branchId,
    staleTime: 1000 * 60 * 5,
  });

  // Scanner hook
  const { resetScanner } = useScanner({
    onScan: async (value) => {
      setScannerInput(value);
      // Try to lookup ProductInstance by IMEI
      try {
        const res = await fetch(
          `/api/product-instances?serialNumber=${encodeURIComponent(value)}&branchId=${encodeURIComponent(
            branchId!
          )}`
        );
        if (res.ok) {
          const data = await res.json();
          const instance = data.instance;
          cart.addLine({
            productInstanceId: instance.id,
            name: instance.product.name,
            serialNumber: instance.serialNumber,
            unitPrice: instance.product.salePrice,
            qty: 1,
          });
          setShowCart(true);
          setTimeout(() => setScannerInput(''), 1000);
        }
      } catch (error) {
        console.error('Scan error:', error);
      }
    },
    debounceMs: 300,
  });

  // Filter inventory for search
  const filtered = useMemo(() => {
    if (!search) return inventory;
    const q = search.toLowerCase();
    return inventory.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.brand.toLowerCase().includes(q) ||
        i.model.toLowerCase().includes(q)
    );
  }, [search, inventory]);

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        branchId,
        userId: user?.id,
        customerId: cart.customerId || null,
        discount: cart.discountValue,
        discountType: cart.discountType,
        taxPercent: cart.taxPercent,
        items: cart.lines.map((line) => ({
          productInstanceId: line.productInstanceId,
          inventoryId: line.inventoryItemId,
          qty: line.qty,
          price: line.unitPrice,
        })),
        payments: cart.payments,
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Checkout failed');
      return res.json();
    },
    onSuccess: (data) => {
      setLastSale(data.sale);
      setShowReceipt(true);
      cart.clearCart();
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  const addToCart = (item: InventoryRow) => {
    cart.addLine({
      inventoryItemId: item.id,
      name: item.name,
      unitPrice: item.salePrice,
      qty: 1,
    });
    setShowCart(true);
  };

  const handleCheckout = () => {
    if (cart.payments.length === 0) {
      alert('Please add at least one payment method');
      return;
    }
    checkoutMutation.mutate();
  };

  if (!user || user.role === USER_ROLE.TECHNICIAN) {
    return <div className="p-4 text-red-600">Access denied</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Product Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="mb-4 flex gap-2">
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={() => setShowCart(!showCart)}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <ShoppingCart size={18} />
            Cart ({cart.lines.length})
          </Button>
        </div>

        {/* Scanner Input */}
        <div className="mb-4 rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 p-3">
          <Label className="text-xs font-semibold text-amber-900">
            <Zap size={14} className="mb-1 inline" /> Scanner Ready
          </Label>
          <Input
            placeholder="Scan barcode/IMEI here (auto-capture)"
            value={scannerInput}
            readOnly
            className="mt-2 bg-white font-mono text-sm"
          />
          <p className="mt-1 text-xs text-amber-700">
            {scannerInput ? 'Processing...' : 'Ready for barcode input'}
          </p>
        </div>

        {inventoryLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden transition hover:shadow-lg cursor-pointer"
                onClick={() => addToCart(item)}
              >
                {item.imageUrl && (
                  <div className="relative h-32 w-full bg-gray-200">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-3">
                  <h3 className="truncate font-semibold text-sm">{item.name}</h3>
                  <p className="text-xs text-gray-600">
                    {item.brand} {item.model}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-bold text-blue-600">{formatMmk(item.salePrice)}</span>
                    <span
                      className={cn(
                        'text-xs font-semibold',
                        item.stockQty > 0 ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {item.stockQty} in stock
                    </span>
                  </div>
                  {item.imeiSerial && (
                    <p className="text-xs text-gray-500 mt-1">
                      IMEI: {item.imeiSerial.substring(0, 8)}...
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      {showCart && (
        <div
          ref={cartDrawerRef}
          className="w-full sm:w-96 border-l bg-white shadow-lg flex flex-col max-h-screen overflow-hidden"
        >
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-lg font-bold">Cart</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCart(false)}
            >
              <X size={18} />
            </Button>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-3">
            {cart.lines.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-8">
                Your cart is empty
              </p>
            ) : (
              cart.lines.map((line, idx) => {
                const lineId = line.productInstanceId || line.inventoryItemId;
                return (
                  <div
                    key={idx}
                    className="rounded-lg border bg-gray-50 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{line.name}</p>
                        {line.serialNumber && (
                          <p className="text-xs text-gray-600">S/N: {line.serialNumber}</p>
                        )}
                        <p className="text-xs text-blue-600">
                          {formatMmk(line.unitPrice)} × {line.qty}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cart.removeLine(lineId!)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pricing Section */}
          {cart.lines.length > 0 && (
            <div className="border-t p-4 space-y-3 bg-gray-50">
              {/* Discount */}
              <div>
                <Label className="text-xs">Discount</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={cart.discountValue}
                    onChange={(e) =>
                      cart.setDiscount(parseFloat(e.target.value) || 0, 'FIXED')
                    }
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    variant={cart.discountType === 'PERCENTAGE' ? 'default' : 'outline'}
                    onClick={() =>
                      cart.setDiscount(cart.discountValue, 'PERCENTAGE')
                    }
                  >
                    %
                  </Button>
                </div>
              </div>

              {/* Tax */}
              <div>
                <Label className="text-xs">Tax (%)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={cart.taxPercent}
                  onChange={(e) => cart.setTaxPercent(parseFloat(e.target.value) || 0)}
                  className="text-sm"
                />
              </div>

              {/* Totals */}
              <div className="space-y-1 border-t pt-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatMmk(cart.getSubtotal())}</span>
                </div>
                {cart.getDiscountAmount() > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Discount:</span>
                    <span>-{formatMmk(cart.getDiscountAmount())}</span>
                  </div>
                )}
                {cart.getTaxAmount() > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>+{formatMmk(cart.getTaxAmount())}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-1">
                  <span>Total:</span>
                  <span className="text-blue-600">{formatMmk(cart.getGrandTotal())}</span>
                </div>
              </div>

              {/* Split Payments */}
              <div className="border-t pt-3">
                <Label className="text-xs mb-2 block">Payment Methods</Label>
                <div className="space-y-2">
                  {cart.payments.map((payment) => (
                    <div key={payment.id} className="flex gap-2 items-center">
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={payment.amount}
                        onChange={(e) =>
                          cart.updatePayment(payment.id, parseFloat(e.target.value) || 0)
                        }
                        className="text-sm flex-1"
                      />
                      <select
                        value={payment.method}
                        className="text-sm border rounded px-2 py-1 flex-1"
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cart.removePayment(payment.id)}
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      cart.addPayment({
                        id: Math.random().toString(),
                        method: 'CASH',
                        amount: cart.getRemainingAmount(),
                      });
                    }}
                    className="w-full"
                  >
                    + Add Payment
                  </Button>
                </div>
                {cart.payments.length > 0 && (
                  <div className="mt-2 flex justify-between text-sm font-semibold">
                    <span>Remaining:</span>
                    <span className={cn(
                      cart.getRemainingAmount() > 0.01 ? 'text-red-600' : 'text-green-600'
                    )}>
                      {formatMmk(Math.max(0, cart.getRemainingAmount()))}
                    </span>
                  </div>
                )}
              </div>

              {/* Checkout Button */}
              <Button
                onClick={handleCheckout}
                disabled={checkoutMutation.isPending || cart.getRemainingAmount() > 0.01}
                className="w-full gap-2 bg-green-600 hover:bg-green-700"
              >
                {checkoutMutation.isPending ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <ChevronsRight size={18} />
                )}
                Complete Sale
              </Button>

              {cart.getRemainingAmount() > 0.01 && (
                <p className="text-xs text-red-600 text-center">
                  Remaining: {formatMmk(cart.getRemainingAmount())}
                </p>
              )}

              <Button
                variant="outline"
                onClick={() => cart.clearCart()}
                className="w-full text-red-600"
              >
                Clear Cart
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardContent className="p-4">
              <div className="mb-4">
                <Receipt
                  sale={{
                    id: lastSale.id,
                    totalAmount: lastSale.totalAmount,
                    discount: lastSale.discount,
                    tax: lastSale.tax,
                    createdAt: lastSale.createdAt,
                    items: cart.lines.map((line) => ({
                      name: line.name,
                      serialNumber: line.serialNumber,
                      qty: line.qty,
                      price: line.unitPrice,
                      subtotal: line.unitPrice * line.qty,
                    })),
                    payments: cart.payments,
                  }}
                />
              </div>
              <Button
                onClick={() => {
                  setShowReceipt(false);
                  setShowCart(false);
                }}
                className="w-full"
              >
                Done
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
