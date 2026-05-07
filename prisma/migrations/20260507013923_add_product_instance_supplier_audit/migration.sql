/*
  Warnings:

  - You are about to drop the column `supplier` on the `inventory_items` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT '',
    "sale_price" REAL NOT NULL,
    "wholesale_price" REAL NOT NULL DEFAULT 0,
    "image_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "product_instances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "purchase_price" REAL NOT NULL,
    "cost_price" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "product_instances_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "product_instances_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "context" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT NOT NULL DEFAULT '',
    "payment_terms" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "supplier_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplier_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "user_id" TEXT,
    "reference" TEXT DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "supplier_transactions_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "supplier_transactions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "supplier_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_inventory_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branch_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT '',
    "imei_serial" TEXT,
    "stock_qty" INTEGER NOT NULL DEFAULT 0,
    "cost_price" REAL NOT NULL,
    "sale_price" REAL NOT NULL,
    "wholesale_price" REAL NOT NULL DEFAULT 0,
    "supplier_id" TEXT,
    "image_url" TEXT,
    "last_updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_items_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "inventory_items_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_inventory_items" ("branch_id", "brand", "category", "cost_price", "id", "image_url", "imei_serial", "last_updated", "model", "name", "sale_price", "stock_qty", "wholesale_price") SELECT "branch_id", "brand", "category", "cost_price", "id", "image_url", "imei_serial", "last_updated", "model", "name", "sale_price", "stock_qty", "wholesale_price" FROM "inventory_items";
DROP TABLE "inventory_items";
ALTER TABLE "new_inventory_items" RENAME TO "inventory_items";
CREATE INDEX "inventory_items_branch_id_idx" ON "inventory_items"("branch_id");
CREATE INDEX "inventory_items_category_idx" ON "inventory_items"("category");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE UNIQUE INDEX "product_instances_serial_number_key" ON "product_instances"("serial_number");

-- CreateIndex
CREATE INDEX "product_instances_product_id_idx" ON "product_instances"("product_id");

-- CreateIndex
CREATE INDEX "product_instances_branch_id_idx" ON "product_instances"("branch_id");

-- CreateIndex
CREATE INDEX "product_instances_status_idx" ON "product_instances"("status");

-- CreateIndex
CREATE INDEX "product_instances_serial_number_idx" ON "product_instances"("serial_number");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_branch_id_idx" ON "audit_logs"("branch_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_idx" ON "audit_logs"("entity_type");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "supplier_transactions_supplier_id_idx" ON "supplier_transactions"("supplier_id");

-- CreateIndex
CREATE INDEX "supplier_transactions_branch_id_idx" ON "supplier_transactions"("branch_id");

-- CreateIndex
CREATE INDEX "supplier_transactions_type_idx" ON "supplier_transactions"("type");

-- CreateIndex
CREATE INDEX "supplier_transactions_date_idx" ON "supplier_transactions"("date");
