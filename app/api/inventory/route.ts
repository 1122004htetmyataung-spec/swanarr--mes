import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

import { INVENTORY_CATEGORY } from "@/lib/db-enums";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId")?.trim();

  if (!branchId) {
    return NextResponse.json({ error: "branchId is required" }, { status: 400 });
  }

  const items = await prisma.inventoryItem.findMany({
    where: { branchId },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: {
      id: true,
      branchId: true,
      category: true,
      name: true,
      brand: true,
      model: true,
      imeiSerial: true,
      stockQty: true,
      costPrice: true,
      salePrice: true,
      supplier: true,
      imageUrl: true,
    },
  });

  return NextResponse.json({ items });
}

type Body = {
  branchId?: string;
  category?: string;
  name?: string;
  brand?: string;
  model?: string;
  imeiSerial?: string | null;
  stockQty?: number;
  costPrice?: number;
  salePrice?: number;
  supplier?: string;
  imageUrl?: string | null;
};

function getImageExtension(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "jpg";
}

async function saveInventoryImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Image file is required.");
  }
  const ext = getImageExtension(file.type);
  const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
  const relativePath = `/uploads/inventory/${fileName}`;
  const absoluteDir = path.join(process.cwd(), "public", "uploads", "inventory");
  await mkdir(absoluteDir, { recursive: true });
  await writeFile(
    path.join(absoluteDir, fileName),
    Buffer.from(await file.arrayBuffer())
  );
  return relativePath;
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");
  let body: Body = {};
  let uploadedImageUrl: string | null = null;

  if (isMultipart) {
    const form = await request.formData();
    const file = form.get("image");
    if (file instanceof File && file.size > 0) {
      uploadedImageUrl = await saveInventoryImage(file);
    }
    body = {
      branchId: String(form.get("branchId") ?? ""),
      category: String(form.get("category") ?? ""),
      name: String(form.get("name") ?? ""),
      brand: String(form.get("brand") ?? ""),
      model: String(form.get("model") ?? ""),
      imeiSerial: String(form.get("imeiSerial") ?? ""),
      stockQty: Number(form.get("stockQty") ?? 0),
      costPrice: Number(form.get("costPrice") ?? 0),
      salePrice: Number(form.get("salePrice") ?? 0),
      supplier: String(form.get("supplier") ?? ""),
      imageUrl: String(form.get("imageUrl") ?? ""),
    };
  } else {
    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
  }

  const branchId = typeof body.branchId === "string" ? body.branchId.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const salePrice = Number.isFinite(Number(body.salePrice))
    ? Math.max(0, Number(body.salePrice))
    : -1;
  const stockQty = Number.isFinite(Number(body.stockQty))
    ? Math.max(0, Math.floor(Number(body.stockQty)))
    : -1;
  const costPrice = Number.isFinite(Number(body.costPrice))
    ? Math.max(0, Number(body.costPrice))
    : 0;

  if (!branchId || !name || stockQty < 0 || salePrice < 0) {
    return NextResponse.json({ error: "branchId, name, stockQty, and salePrice are required." }, { status: 400 });
  }
  if (!Object.values(INVENTORY_CATEGORY).includes(category as (typeof INVENTORY_CATEGORY)[keyof typeof INVENTORY_CATEGORY])) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }

  const created = await prisma.inventoryItem.create({
    data: {
      branchId,
      category,
      name,
      brand: typeof body.brand === "string" ? body.brand.trim() : "",
      model: typeof body.model === "string" ? body.model.trim() : "",
      imeiSerial:
        typeof body.imeiSerial === "string" && body.imeiSerial.trim().length > 0
          ? body.imeiSerial.trim()
          : null,
      stockQty,
      costPrice,
      salePrice,
      wholesalePrice: salePrice,
      supplier: typeof body.supplier === "string" ? body.supplier.trim() : "",
      imageUrl: uploadedImageUrl
        ?? (typeof body.imageUrl === "string" && body.imageUrl.trim().length > 0
          ? body.imageUrl.trim()
          : null),
    },
  });

  return NextResponse.json({ item: created }, { status: 201 });
}
