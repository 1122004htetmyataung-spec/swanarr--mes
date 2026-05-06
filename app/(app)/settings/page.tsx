"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthUser } from "@/hooks/use-auth-user";

type Setting = {
  shopName: string;
  logoUrl: string | null;
  primaryColor: string;
};

export default function SettingsPage() {
  const user = useAuthUser();
  const queryClient = useQueryClient();
  const [shopName, setShopName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1E3A8A");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const { data } = useQuery({
    queryKey: ["settings", user?.branchId],
    queryFn: async () => {
      const res = await fetch(`/api/settings?branchId=${encodeURIComponent(user?.branchId ?? "")}`);
      const json = (await res.json()) as { setting: Setting };
      setShopName((prev) => prev || json.setting.shopName);
      setPrimaryColor((prev) => (prev === "#1E3A8A" ? json.setting.primaryColor : prev));
      return json.setting;
    },
    enabled: Boolean(user?.branchId),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const form = new FormData();
      form.append("branchId", user.branchId);
      form.append("shopName", shopName);
      form.append("primaryColor", primaryColor);
      if (logoFile) form.append("logo", logoFile);
      const res = await fetch("/api/settings", { method: "PATCH", body: form });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Save failed");
    },
    onSuccess: async () => {
      setLogoFile(null);
      await queryClient.invalidateQueries({ queryKey: ["settings", user?.branchId] });
    },
  });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Card className="rounded-3xl border-white/50 bg-white/80 shadow-glass backdrop-blur-md">
        <CardHeader><CardTitle>Shop settings</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Shop name</Label>
            <Input value={shopName} onChange={(e) => setShopName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Primary color</Label>
            <div className="flex gap-2">
              <Input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-11 w-20 p-1" />
              <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Logo upload</Label>
            <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="md:col-span-2">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              Save settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-white/50 bg-white/80 shadow-glass backdrop-blur-md">
        <CardHeader><CardTitle>Receipt preview</CardTitle></CardHeader>
        <CardContent>
          <div className="max-w-sm rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-3 border-b pb-2">
              <p className="text-lg font-bold" style={{ color: primaryColor }}>{shopName || data?.shopName || "Shop Name"}</p>
              <p className="text-xs text-muted-foreground">Thermal receipt preview</p>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Item A x1</span><span>50,000 Ks</span></div>
              <div className="flex justify-between"><span>Item B x2</span><span>120,000 Ks</span></div>
              <div className="mt-2 border-t pt-2 font-semibold flex justify-between"><span>Total</span><span>170,000 Ks</span></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
