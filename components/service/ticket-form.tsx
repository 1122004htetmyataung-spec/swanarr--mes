'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCartStore } from '@/stores/cart-store';
import { SignatureCanvas } from '@/components/service/signature-canvas';

interface InventoryRow {
  id: string;
  name: string;
  brand: string;
  model: string;
  stockQty: number;
  salePrice: number;
}

interface TicketFormProps {
  branchId: string;
  customerId?: string | null;
  inventoryItems: InventoryRow[];
  onSave: (data: any) => void;
}

export function TicketForm({ branchId, customerId, inventoryItems, onSave }: TicketFormProps) {
  const [deviceName, setDeviceName] = useState('');
  const [deviceBrand, setDeviceBrand] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [deviceSerialNumber, setDeviceSerialNumber] = useState('');
  const [description, setDescription] = useState('');
  const [priceType, setPriceType] = useState<'FIXED' | 'ESTIMATE'>('FIXED');
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [warrantyTerms, setWarrantyTerms] = useState('');
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [parts, setParts] = useState<{
    inventoryId: string;
    qty: number;
    unitPrice: number;
  }[]>([]);

  const subtotal = useMemo(
    () => parts.reduce((sum, part) => sum + part.qty * part.unitPrice, 0),
    [parts]
  );

  const totalCost = useMemo(
    () => subtotal + serviceCharge,
    [subtotal, serviceCharge]
  );

  const addPart = () => {
    setParts((current) => [
      ...current,
      { inventoryId: inventoryItems[0]?.id ?? '', qty: 1, unitPrice: inventoryItems[0]?.salePrice ?? 0 },
    ]);
  };

  const updatePart = (index: number, key: 'inventoryId' | 'qty' | 'unitPrice', value: string | number) => {
    setParts((current) =>
      current.map((part, idx) =>
        idx === index ? { ...part, [key]: value } : part
      )
    );
  };

  const removePart = (index: number) => {
    setParts((current) => current.filter((_, idx) => idx !== index));
  };

  const handleSubmit = () => {
    onSave({
      branchId,
      customerId,
      deviceName,
      deviceBrand,
      deviceModel,
      deviceSerialNumber,
      description,
      priceType,
      estimatedCost,
      serviceCharge,
      parts,
      totalCost,
      warrantyTerms,
      estimatedCompletionDate: estimatedCompletionDate || null,
      customerSignature: signature,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label>Device Name</Label>
              <Input value={deviceName} onChange={(e) => setDeviceName(e.target.value)} />
            </div>
            <div>
              <Label>Brand</Label>
              <Input value={deviceBrand} onChange={(e) => setDeviceBrand(e.target.value)} />
            </div>
            <div>
              <Label>Model</Label>
              <Input value={deviceModel} onChange={(e) => setDeviceModel(e.target.value)} />
            </div>
            <div>
              <Label>Serial / IMEI</Label>
              <Input value={deviceSerialNumber} onChange={(e) => setDeviceSerialNumber(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Description / Problem</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <Label>Price Type</Label>
              <select
                className="mt-1 w-full rounded border px-3 py-2"
                value={priceType}
                onChange={(e) => setPriceType(e.target.value as 'FIXED' | 'ESTIMATE')}
              >
                <option value="FIXED">FIXED</option>
                <option value="ESTIMATE">ESTIMATE</option>
              </select>
            </div>
            <div>
              <Label>Estimated Cost</Label>
              <Input
                type="number"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Service Charge</Label>
              <Input
                type="number"
                value={serviceCharge}
                onChange={(e) => setServiceCharge(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label>Warranty Terms</Label>
              <Input value={warrantyTerms} onChange={(e) => setWarrantyTerms(e.target.value)} />
            </div>
            <div>
              <Label>Estimated Completion</Label>
              <Input
                type="date"
                value={estimatedCompletionDate}
                onChange={(e) => setEstimatedCompletionDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <div>
              <Label>Spare Parts</Label>
              <p className="text-xs text-muted-foreground">Add inventory parts and track cost.</p>
            </div>
            <Button size="sm" onClick={addPart}>
              <Plus size={14} className="mr-2" /> Add Part
            </Button>
          </div>

          <div className="space-y-3">
            {parts.map((part, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-5 items-end border rounded-lg p-3">
                <div className="sm:col-span-2">
                  <Label>Part</Label>
                  <select
                    value={part.inventoryId}
                    onChange={(e) => {
                      const selected = inventoryItems.find((item) => item.id === e.target.value);
                      updatePart(index, 'inventoryId', e.target.value);
                      if (selected) {
                        updatePart(index, 'unitPrice', selected.salePrice);
                      }
                    }}
                    className="mt-1 w-full rounded border px-3 py-2"
                  >
                    {inventoryItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} / {item.brand} {item.model}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    value={part.qty}
                    onChange={(e) => updatePart(index, 'qty', Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Unit Price</Label>
                  <Input
                    type="number"
                    value={part.unitPrice}
                    onChange={(e) => updatePart(index, 'unitPrice', Number(e.target.value))}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removePart(index)}
                    className="w-full"
                  >
                    <Trash2 size={14} className="mr-2" /> Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border bg-slate-50 p-4">
            <div className="flex justify-between text-sm">
              <span>Parts subtotal</span>
              <span>₹{subtotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Service charge</span>
              <span>₹{serviceCharge.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold pt-2">
              <span>Total cost</span>
              <span>₹{totalCost.toFixed(0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <SignatureCanvas onSignatureChange={setSignature} />
          {signature && (
            <div className="mt-2 text-xs text-gray-500">Signature captured.</div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSubmit} className="w-full">
        Save Ticket
      </Button>
    </div>
  );
}
