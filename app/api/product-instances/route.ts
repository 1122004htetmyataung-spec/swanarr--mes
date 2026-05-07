import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/product-instances
 * Query parameters:
 * - serialNumber or imei: The unique identifier to search
 * - branchId: Branch filter
 * - status: Filter by status (IN_STOCK, SOLD, REPAIRING, DEFECTIVE)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const serialNumber = searchParams.get('serialNumber') || searchParams.get('imei');
    const branchId = searchParams.get('branchId');
    const status = searchParams.get('status') || 'IN_STOCK';

    if (!serialNumber) {
      return NextResponse.json(
        { error: 'serialNumber or imei parameter required' },
        { status: 400 }
      );
    }

    if (!branchId) {
      return NextResponse.json(
        { error: 'branchId parameter required' },
        { status: 400 }
      );
    }

    // Find matching ProductInstance
    const instance = await prisma.productInstance.findFirst({
      where: {
        serialNumber: serialNumber.toUpperCase().trim(),
        branchId,
        status,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: true,
            brand: true,
            model: true,
            salePrice: true,
            wholesalePrice: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!instance) {
      return NextResponse.json(
        { error: 'Product instance not found or not available' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      instance: {
        id: instance.id,
        serialNumber: instance.serialNumber,
        status: instance.status,
        purchasePrice: instance.purchasePrice,
        costPrice: instance.costPrice,
        product: instance.product,
      },
    });
  } catch (error) {
    console.error('ProductInstance lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to lookup product instance' },
      { status: 500 }
    );
  }
}
