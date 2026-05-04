import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { INVENTORY_CATEGORY } from "../lib/db-enums";

const prisma = new PrismaClient();

const demoInventory = [
  {
    id: "seed-inv-md-cctv-01",
    branchId: "seed-branch-mandalay",
    category: INVENTORY_CATEGORY.CCTV,
    name: "8CH Turbo HD DVR",
    brand: "HIKVISION",
    model: "DS-7108HGHI-M1",
    stockQty: 12,
    costPrice: 78000,
    salePrice: 115000,
    wholesalePrice: 95000,
    supplier: "HIKVISION Myanmar",
  },
  {
    id: "seed-inv-md-cctv-02",
    branchId: "seed-branch-mandalay",
    category: INVENTORY_CATEGORY.CCTV_ACC,
    name: "4MP Dome Camera",
    brand: "HIKVISION",
    model: "DS-2CD2143G2-I",
    stockQty: 25,
    costPrice: 62000,
    salePrice: 89000,
    wholesalePrice: 72000,
    supplier: "HIKVISION Myanmar",
  },
  {
    id: "seed-inv-md-phone-01",
    branchId: "seed-branch-mandalay",
    category: INVENTORY_CATEGORY.NEW_PHONE,
    name: "Smartphone 128GB",
    brand: "Samsung",
    model: "Galaxy A25",
    imeiSerial: "BARCODE-A25-DEMO",
    stockQty: 8,
    costPrice: 320000,
    salePrice: 385000,
    wholesalePrice: 350000,
    supplier: "Mobile City",
  },
  {
    id: "seed-inv-md-phone-02",
    branchId: "seed-branch-mandalay",
    category: INVENTORY_CATEGORY.USED_PHONE,
    name: "Used iPhone",
    brand: "Apple",
    model: "iPhone 12",
    imeiSerial: "BARCODE-IP12-DEMO",
    stockQty: 3,
    costPrice: 380000,
    salePrice: 455000,
    wholesalePrice: 0,
    supplier: "Trade-in",
  },
  {
    id: "seed-inv-md-net-01",
    branchId: "seed-branch-mandalay",
    category: INVENTORY_CATEGORY.OTHER,
    name: "Wi-Fi Router AX1800",
    brand: "TP-Link",
    model: "Archer AX21",
    stockQty: 15,
    costPrice: 48000,
    salePrice: 65000,
    wholesalePrice: 55000,
    supplier: "Networking Plus",
  },
  {
    id: "seed-inv-md-laptop-01",
    branchId: "seed-branch-mandalay",
    category: INVENTORY_CATEGORY.USED_LAPTOP,
    name: 'Used Laptop 14"',
    brand: "Lenovo",
    model: "ThinkPad E14",
    stockQty: 4,
    costPrice: 280000,
    salePrice: 350000,
    wholesalePrice: 0,
    supplier: "Used IT",
  },
  {
    id: "seed-inv-kl-cctv-01",
    branchId: "seed-branch-kalaymyo",
    category: INVENTORY_CATEGORY.CCTV,
    name: "16CH NVR",
    brand: "HIKVISION",
    model: "DS-7616NI-K2",
    stockQty: 6,
    costPrice: 195000,
    salePrice: 265000,
    wholesalePrice: 220000,
    supplier: "HIKVISION Myanmar",
  },
  {
    id: "seed-inv-kl-acc-01",
    branchId: "seed-branch-kalaymyo",
    category: INVENTORY_CATEGORY.CCTV_ACC,
    name: "HDD 2TB Surveillance",
    brand: "WD Purple",
    model: "WD22PURZ",
    stockQty: 30,
    costPrice: 52000,
    salePrice: 69000,
    wholesalePrice: 58000,
    supplier: "Storage World",
  },
] as const;

async function main() {
  const mandalay = await prisma.branch.upsert({
    where: { id: "seed-branch-mandalay" },
    update: {},
    create: {
      id: "seed-branch-mandalay",
      name: "Mandalay",
      location: "Mandalay",
    },
  });

  const kalaymyo = await prisma.branch.upsert({
    where: { id: "seed-branch-kalaymyo" },
    update: {},
    create: {
      id: "seed-branch-kalaymyo",
      name: "Kalaymyo",
      location: "Kalaymyo",
    },
  });

  const passwordHash = await bcrypt.hash("owner123", 10);

  await prisma.user.upsert({
    where: { username: "owner" },
    update: {
      passwordHash,
      role: "OWNER",
      branchId: mandalay.id,
    },
    create: {
      username: "owner",
      passwordHash,
      role: "OWNER",
      branchId: mandalay.id,
    },
  });

  await prisma.appSetting.upsert({
    where: { branchId: mandalay.id },
    update: {},
    create: {
      branchId: mandalay.id,
      shopName: "SwanAar II Electronics",
      primaryColor: "#1E3A8A",
    },
  });

  await prisma.appSetting.upsert({
    where: { branchId: kalaymyo.id },
    update: {},
    create: {
      branchId: kalaymyo.id,
      shopName: "SwanAar II Electronics",
      primaryColor: "#1E3A8A",
    },
  });

  for (const row of demoInventory) {
    const branchId =
      row.branchId === "seed-branch-mandalay" ? mandalay.id : kalaymyo.id;
    const imeiSerial =
      "imeiSerial" in row && row.imeiSerial ? String(row.imeiSerial) : null;

    await prisma.inventoryItem.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        branchId,
        category: row.category,
        name: row.name,
        brand: row.brand,
        model: row.model,
        stockQty: row.stockQty,
        costPrice: row.costPrice,
        salePrice: row.salePrice,
        wholesalePrice: row.wholesalePrice,
        supplier: row.supplier,
        imeiSerial,
      },
      update: {
        name: row.name,
        brand: row.brand,
        model: row.model,
        category: row.category,
        salePrice: row.salePrice,
        costPrice: row.costPrice,
        wholesalePrice: row.wholesalePrice,
        supplier: row.supplier,
        imeiSerial,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log("Seed OK:", {
    branches: [mandalay.name, kalaymyo.name],
    login: { username: "owner", password: "owner123" },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
