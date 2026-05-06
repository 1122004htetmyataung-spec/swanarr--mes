-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branch_id" TEXT NOT NULL,
    "shop_name" TEXT NOT NULL DEFAULT 'SwanAar II Electronics',
    "logo_url" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#1E3A8A',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "app_settings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "activity_logs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "min_stock_qty" INTEGER NOT NULL DEFAULT 0,
    "cost_price" REAL NOT NULL,
    "sale_price" REAL NOT NULL,
    "wholesale_price" REAL NOT NULL DEFAULT 0,
    "supplier" TEXT NOT NULL DEFAULT '',
    "image_url" TEXT,
    "last_updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_items_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_inventory_items" ("branch_id", "brand", "category", "cost_price", "id", "image_url", "imei_serial", "last_updated", "model", "name", "sale_price", "stock_qty", "supplier", "wholesale_price") SELECT "branch_id", "brand", "category", "cost_price", "id", "image_url", "imei_serial", "last_updated", "model", "name", "sale_price", "stock_qty", "supplier", "wholesale_price" FROM "inventory_items";
DROP TABLE "inventory_items";
ALTER TABLE "new_inventory_items" RENAME TO "inventory_items";
CREATE INDEX "inventory_items_branch_id_idx" ON "inventory_items"("branch_id");
CREATE INDEX "inventory_items_category_idx" ON "inventory_items"("category");
CREATE TABLE "new_sale_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sale_id" TEXT NOT NULL,
    "inventory_id" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sale_items_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "inventory_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_sale_items" ("id", "inventory_id", "price", "qty", "sale_id") SELECT "id", "inventory_id", "price", "qty", "sale_id" FROM "sale_items";
DROP TABLE "sale_items";
ALTER TABLE "new_sale_items" RENAME TO "sale_items";
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items"("sale_id");
CREATE TABLE "new_service_tickets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branch_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "technician_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "description" TEXT NOT NULL,
    "device_name" TEXT,
    "device_brand" TEXT,
    "device_model" TEXT,
    "price_type" TEXT NOT NULL,
    "service_charge" REAL NOT NULL DEFAULT 0,
    "parts_cost" REAL NOT NULL DEFAULT 0,
    "deposit_paid" REAL NOT NULL DEFAULT 0,
    "remaining_balance" REAL NOT NULL DEFAULT 0,
    "warranty_terms" TEXT NOT NULL DEFAULT '',
    "estimated_completion_date" DATETIME,
    "internal_notes" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "service_tickets_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "service_tickets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "service_tickets_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_service_tickets" ("branch_id", "created_at", "customer_id", "description", "device_brand", "device_model", "device_name", "estimated_completion_date", "id", "internal_notes", "parts_cost", "price_type", "service_charge", "status", "technician_id", "updated_at", "warranty_terms") SELECT "branch_id", "created_at", "customer_id", "description", "device_brand", "device_model", "device_name", "estimated_completion_date", "id", "internal_notes", "parts_cost", "price_type", "service_charge", "status", "technician_id", "updated_at", "warranty_terms" FROM "service_tickets";
DROP TABLE "service_tickets";
ALTER TABLE "new_service_tickets" RENAME TO "service_tickets";
CREATE INDEX "service_tickets_branch_id_idx" ON "service_tickets"("branch_id");
CREATE INDEX "service_tickets_status_idx" ON "service_tickets"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "app_settings_branch_id_key" ON "app_settings"("branch_id");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "activity_logs_branch_id_idx" ON "activity_logs"("branch_id");

-- CreateIndex
CREATE INDEX "activity_logs_timestamp_idx" ON "activity_logs"("timestamp");
