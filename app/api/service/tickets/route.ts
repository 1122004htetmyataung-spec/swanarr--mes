import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    branchId,
    userId,
    customer,
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
    estimatedCompletionDate,
    customerSignature,
  } = body;

  if (!branchId || !userId || !customer || !description || !deviceName) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  const created = await prisma.$transaction(async (tx) => {
    let customerId = null;
    const existingCustomer = await tx.customer.findFirst({
      where: { phone: customer.phone },
    });
    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const newCustomer = await tx.customer.create({
        data: {
          phone: customer.phone,
          name: customer.name,
          address: customer.address || '',
        },
      });
      customerId = newCustomer.id;
    }

    const ticket = await tx.serviceTicket.create({
      data: {
        branchId,
        customerId,
        technicianId: userId,
        description,
        deviceName,
        deviceBrand,
        deviceModel,
        deviceSerialNumber,
        priceType,
        estimatedCost,
        serviceCharge,
        partsCost: parts.reduce((sum: number, part: any) => sum + part.qty * part.unitPrice, 0),
        totalCost,
        warrantyTerms,
        estimatedCompletionDate: estimatedCompletionDate ? new Date(estimatedCompletionDate) : null,
        customerSignature,
      },
    });

    for (const part of parts || []) {
      await tx.serviceTicketPart.create({
        data: {
          ticketId: ticket.id,
          inventoryId: part.inventoryId,
          qty: part.qty,
          unitPrice: part.unitPrice,
          totalPrice: part.qty * part.unitPrice,
        },
      });
      await tx.inventoryItem.update({
        where: { id: part.inventoryId },
        data: { stockQty: { decrement: part.qty } },
      });
    }

    await tx.serviceTicketStatusHistory.create({
      data: {
        ticketId: ticket.id,
        oldStatus: 'NONE',
        newStatus: 'RECEIVED',
        changedBy: userId,
        reason: 'Initial ticket creation',
      },
    });

    return ticket;
  });

  return NextResponse.json({ success: true, ticket: created });
}
