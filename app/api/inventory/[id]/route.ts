import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

import { INVENTORY_CATEGORY } from "@/lib/db-enums";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = {
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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  const id = params.id.trim();
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  if (
    body.category &&
    !Object.values(INVENTORY_CATEGORY).includes(
      body.category as (typeof INVENTORY_CATEGORY)[keyof typeof INVENTORY_CATEGORY]
    )
  ) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }

  const updated = await prisma.inventoryItem.update({
    where: { id },
    data: {
      ...(body.category ? { category: body.category } : {}),
      ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
      ...(typeof body.brand === "string" ? { brand: body.brand.trim() } : {}),
      ...(typeof body.model === "string" ? { model: body.model.trim() } : {}),
      ...(body.imeiSerial !== undefined
        ? { imeiSerial: body.imeiSerial?.trim() || null }
        : {}),
      ...(typeof body.stockQty === "number"
        ? { stockQty: Math.max(0, Math.floor(body.stockQty)) }
        : {}),
      ...(typeof body.costPrice === "number"
        ? { costPrice: Math.max(0, body.costPrice) }
        : {}),
      ...(typeof body.salePrice === "number"
        ? { salePrice: Math.max(0, body.salePrice) }
        : {}),
      ...(typeof body.supplier === "string" ? { supplier: body.supplier.trim() } : {}),
      ...(uploadedImageUrl
        ? { imageUrl: uploadedImageUrl }
        : body.imageUrl !== undefined
          ? { imageUrl: body.imageUrl?.trim() || null }
          : {}),
    },
  });

  return NextResponse.json({ item: updated });
}
