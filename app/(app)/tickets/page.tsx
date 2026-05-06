"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TICKET_STATUS } from "@/lib/db-enums";
import { useAuthUser } from "@/hooks/use-auth-user";

type Ticket = {
  id: string;
  status: string;
  description: string;
  createdAt: string;
  customer: { name: string; phone: string };
  technician: { id: string; username: string } | null;
};

type Technician = { id: string; username: string };

type TicketResponse = {
  tickets: Ticket[];
  technicians: Technician[];
};

const COLUMNS = [
  { key: TICKET_STATUS.PENDING, label: "Pending" },
  { key: TICKET_STATUS.IN_PROGRESS, label: "In Progress" },
  { key: TICKET_STATUS.DONE, label: "Done" },
  { key: TICKET_STATUS.DELIVERED, label: "Delivered" },
] as const;

async function fetchTickets(branchId: string): Promise<TicketResponse> {
  const res = await fetch(`/api/tickets?branchId=${encodeURIComponent(branchId)}`);
  const data = (await res.json()) as TicketResponse & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Failed to load tickets.");
  return data;
}

async function createTicket(payload: Record<string, unknown>) {
  const res = await fetch("/api/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Could not create ticket.");
}

export default function TicketsPage() {
  const user = useAuthUser();
  const queryClient = useQueryClient();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [description, setDescription] = useState("");
  const [technicianId, setTechnicianId] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", user?.branchId],
    queryFn: () => fetchTickets(user?.branchId ?? ""),
    enabled: Boolean(user?.branchId),
  });

  const createMutation = useMutation({
    mutationFn: createTicket,
    onSuccess: async () => {
      setCustomerName("");
      setCustomerPhone("");
      setDescription("");
      setTechnicianId("");
      await queryClient.invalidateQueries({ queryKey: ["tickets", user?.branchId] });
    },
  });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Card className="rounded-3xl border-white/50 bg-white/80 shadow-glass backdrop-blur-md">
        <CardHeader>
          <CardTitle>Create service ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate({
                branchId: user.branchId,
                userId: user.id,
                customerName,
                customerPhone,
                description,
                technicianId: technicianId || null,
              });
            }}
          >
            <div className="space-y-1.5">
              <Label>Customer name</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Customer phone</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Assign technician</Label>
              <Select value={technicianId} onValueChange={setTechnicianId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {data?.technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-4">
              <Label>Issue description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>
            <div className="md:col-span-4">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Create ticket
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((column) => (
          <Card key={column.key} className="rounded-3xl border-white/50 bg-white/80 shadow-glass backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{column.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                (data?.tickets ?? [])
                  .filter((ticket) => ticket.status === column.key)
                  .map((ticket) => (
                    <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block rounded-2xl border bg-background/60 p-3 hover:bg-background">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <Badge variant="secondary">#{ticket.id.slice(0, 8)}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="line-clamp-2 text-sm font-medium">{ticket.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ticket.customer.name} · {ticket.customer.phone}
                      </p>
                      {ticket.technician ? (
                        <p className="mt-1 text-xs text-muted-foreground">Tech: {ticket.technician.username}</p>
                      ) : null}
                    </Link>
                  ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
