"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TICKET_STATUS } from "@/lib/db-enums";
import { useAuthStore } from "@/stores/auth-store";

type TicketDetail = {
  id: string;
  status: string;
  description: string;
  internalNotes: string;
  estimatedCompletionDate: string | null;
  customer: { name: string; phone: string; address: string };
  technician: { id: string; username: string } | null;
  photos: Array<{ id: string; photoType: string; imagePath: string }>;
};

async function fetchTicket(id: string, branchId: string): Promise<TicketDetail> {
  const res = await fetch(`/api/tickets/${id}?branchId=${encodeURIComponent(branchId)}`);
  const data = (await res.json()) as { ticket?: TicketDetail; error?: string };
  if (!res.ok || !data.ticket) throw new Error(data.error ?? "Failed to load ticket.");
  return data.ticket;
}

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [estimatedDate, setEstimatedDate] = useState("");

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket-detail", ticketId, user?.branchId],
    queryFn: () => fetchTicket(ticketId, user?.branchId ?? ""),
    enabled: Boolean(ticketId && user?.branchId),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Update failed.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ticket-detail", ticketId, user?.branchId] });
      await queryClient.invalidateQueries({ queryKey: ["tickets", user?.branchId] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      photoType,
    }: {
      file: File;
      photoType: "BEFORE" | "AFTER";
    }) => {
      const form = new FormData();
      form.append("branchId", user?.branchId ?? "");
      form.append("photoType", photoType);
      form.append("file", file);
      const res = await fetch(`/api/tickets/${ticketId}/photos`, { method: "POST", body: form });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ticket-detail", ticketId, user?.branchId] });
    },
  });

  useEffect(() => {
    if (!ticket) return;
    setNotes(ticket.internalNotes ?? "");
    setEstimatedDate(ticket.estimatedCompletionDate?.slice(0, 10) ?? "");
  }, [ticket]);
  if (!user) return null;

  if (isLoading || !ticket) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const beforePhotos = ticket.photos.filter((p) => p.photoType === "BEFORE");
  const afterPhotos = ticket.photos.filter((p) => p.photoType === "AFTER");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="rounded-3xl border-white/50 bg-white/80 shadow-glass backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Ticket <Badge variant="secondary">#{ticket.id.slice(0, 8)}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">{ticket.description}</p>
          <p className="text-sm text-muted-foreground">
            Customer: {ticket.customer.name} · {ticket.customer.phone}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={ticket.status}
                onValueChange={(status) =>
                  updateMutation.mutate({ branchId: user.branchId, status })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TICKET_STATUS).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estimated completion date</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={estimatedDate}
                  onChange={(e) => setEstimatedDate(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    updateMutation.mutate({
                      branchId: user.branchId,
                      estimatedCompletionDate: estimatedDate || null,
                    })
                  }
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-white/50 bg-white/80 shadow-glass backdrop-blur-md">
        <CardHeader>
          <CardTitle>Internal notes (not visible to customer)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <textarea
            className="min-h-32 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button
            type="button"
            onClick={() => updateMutation.mutate({ branchId: user.branchId, internalNotes: notes })}
          >
            Save notes
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-3xl border-white/50 bg-white/80 shadow-glass backdrop-blur-md">
          <CardHeader>
            <CardTitle>Before photos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                uploadMutation.mutate({ file, photoType: "BEFORE" });
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              {beforePhotos.map((photo) => (
                <div key={photo.id} className="relative h-32 w-full overflow-hidden rounded-xl">
                  <Image src={photo.imagePath} alt="Before repair" fill className="object-cover" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/50 bg-white/80 shadow-glass backdrop-blur-md">
          <CardHeader>
            <CardTitle>After photos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                uploadMutation.mutate({ file, photoType: "AFTER" });
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              {afterPhotos.map((photo) => (
                <div key={photo.id} className="relative h-32 w-full overflow-hidden rounded-xl">
                  <Image src={photo.imagePath} alt="After repair" fill className="object-cover" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
