'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthUser } from '@/hooks/use-auth-user';
import { TicketForm } from '@/components/service/ticket-form';

export default function ServicePage() {
  const { user, branchId } = useAuthUser();
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  const queryClient = useQueryClient();
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  useEffect(() => {
    async function loadInventory() {
      if (!branchId) return;
      const res = await fetch(`/api/inventory?branchId=${encodeURIComponent(branchId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setInventoryItems(data.items || []);
    }
    loadInventory();
  }, [branchId]);

  const createTicketMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/service/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Could not create ticket');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['service-tickets']);
      alert('Ticket created successfully');
    },
  });

  if (!user || !branchId) {
    return <div className="p-4 text-red-600">Access denied or branch not selected.</div>;
  }

  const handleSave = async (data: any) => {
    const payload = {
      ...data,
      userId: user.id,
      customer: {
        phone: customerPhone,
        name: customerName,
        address: customerAddress,
      },
    };
    createTicketMutation.mutate(payload);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <Card>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Customer Phone</Label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
            <div>
              <Label>Customer Name</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Customer Address</Label>
              <Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <TicketForm
          branchId={branchId}
          customerId={customerId}
          inventoryItems={inventoryItems}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
