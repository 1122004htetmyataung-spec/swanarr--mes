"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INVENTORY_CATEGORY } from "@/lib/db-enums";
import { formatMmk } from "@/lib/format-mmk";
import { useAuthUser } from "@/hooks/use-auth-user";

type Item = {
  id: string;
  category: string;
  name: string;
  brand: string;
  model: string;
  imageUrl: string | null;
  stockQty: number;
  costPrice: number;
  salePrice: number;
  supplier: string;
};

type InventoryForm = {
  id: string;
  category: string;
  name: string;
  brand: string;
  model: string;
  stockQty: number;
  costPrice: number;
  salePrice: number;
  supplier: string;
  imageUrl: string;
};

const EMPTY_FORM: InventoryForm = {
  id: "",
  category: INVENTORY_CATEGORY.OTHER,
  name: "",
  brand: "",
  model: "",
  stockQty: 0,
  costPrice: 0,
  salePrice: 0,
  supplier: "",
  imageUrl: "",
};

export default function InventoryPage() {
  const user = useAuthUser();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<InventoryForm>(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory", user?.branchId],
    queryFn: async () => {
      const res = await fetch(`/api/inventory?branchId=${encodeURIComponent(user?.branchId ?? "")}`);
      const data = (await res.json()) as { items: Item[] };
      return data.items;
    },
    enabled: Boolean(user?.branchId),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const url = editing ? `/api/inventory/${form.id}` : "/api/inventory";
      const method = editing ? "PATCH" : "POST";
      const payload = new FormData();
      payload.append("branchId", user.branchId);
      payload.append("category", form.category);
      payload.append("name", form.name);
      payload.append("brand", form.brand);
      payload.append("model", form.model);
      payload.append("stockQty", String(form.stockQty));
      payload.append("costPrice", String(form.costPrice));
      payload.append("salePrice", String(form.salePrice));
      payload.append("supplier", form.supplier);
      payload.append("imageUrl", form.imageUrl.trim());
      if (imageFile) {
        payload.append("image", imageFile);
      }
      const res = await fetch(url, {
        method,
        body: payload,
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
    },
    onSuccess: async () => {
      setForm(EMPTY_FORM);
      setEditing(false);
      setImageFile(null);
      await queryClient.invalidateQueries({ queryKey: ["inventory", user?.branchId] });
    },
  });

  const filtered = items.filter((item) =>
    `${item.name} ${item.brand} ${item.model} ${item.category}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Card className="rounded-3xl border-white/50 bg-white/80 shadow-glass backdrop-blur-md">
        <CardHeader>
          <CardTitle>{editing ? "Edit product" : "Add product"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Brand</Label>
              <Input value={form.brand} onChange={(e) => setForm((s) => ({ ...s, brand: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Model</Label>
              <Input value={form.model} onChange={(e) => setForm((s) => ({ ...s, model: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(category) => setForm((s) => ({ ...s, category }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(INVENTORY_CATEGORY).map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Stock</Label>
              <Input type="number" min={0} value={form.stockQty} onChange={(e) => setForm((s) => ({ ...s, stockQty: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label>Cost price</Label>
              <Input type="number" min={0} value={form.costPrice} onChange={(e) => setForm((s) => ({ ...s, costPrice: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label>Sale price</Label>
              <Input type="number" min={0} value={form.salePrice} onChange={(e) => setForm((s) => ({ ...s, salePrice: Number(e.target.value) }))} required />
            </div>
            <div className="space-y-1">
              <Label>Supplier</Label>
              <Input value={form.supplier} onChange={(e) => setForm((s) => ({ ...s, supplier: e.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Image URL</Label>
              <Input
                placeholder="https://example.com/product.jpg"
                value={form.imageUrl}
                onChange={(e) => setForm((s) => ({ ...s, imageUrl: e.target.value }))}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Upload image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="md:col-span-4 flex gap-2">
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                {editing ? "Update" : "Add"}
              </Button>
              {editing ? (
                <Button type="button" variant="outline" onClick={() => { setEditing(false); setForm(EMPTY_FORM); setImageFile(null); }}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-white/50 bg-white/80 shadow-glass backdrop-blur-md">
        <CardHeader>
          <CardTitle>Inventory list</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Search product..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="overflow-x-auto rounded-2xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left">Image</th>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-right">Stock</th>
                  <th className="px-3 py-2 text-right">Price</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td className="px-3 py-8 text-center text-muted-foreground" colSpan={6}>Loading...</td></tr>
                ) : filtered.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="relative h-12 w-12 overflow-hidden rounded-lg border bg-muted/30">
                        {item.imageUrl ? (
                          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" unoptimized />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{[item.brand, item.model].filter(Boolean).join(" · ")}</p>
                    </td>
                    <td className="px-3 py-2">{item.category}</td>
                    <td className="px-3 py-2 text-right">{item.stockQty}</td>
                    <td className="px-3 py-2 text-right">{formatMmk(item.salePrice)}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditing(true);
                          setForm({
                            id: item.id,
                            category: item.category,
                            name: item.name,
                            brand: item.brand,
                            model: item.model,
                            stockQty: item.stockQty,
                            costPrice: item.costPrice,
                            salePrice: item.salePrice,
                            supplier: item.supplier,
                            imageUrl: item.imageUrl ?? "",
                          });
                        }}
                      >
                        <Pencil className="mr-1 size-4" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
