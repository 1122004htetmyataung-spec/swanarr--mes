/*
  Warnings:

  - You are about to drop the `activity_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `min_stock_qty` on the `inventory_items` table. All the data in the column will be lost.
  - You are about to drop the column `deposit_paid` on the `service_tickets` table. All the data in the column will be lost.
  - You are about to drop the column `remaining_balance` on the `service_tickets` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "activity_logs_timestamp_idx";

-- DropIndex
DROP INDEX "activity_logs_branch_id_idx";

-- DropIndex
DROP INDEX "activity_logs_user_id_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "activity_logs";
PRAGMA foreign_keys=on;

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
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "base_salary" REAL,
    "commission_rate" REAL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" DATETIME,
    "last_activity_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_users" ("base_salary", "branch_id", "commission_rate", "created_at", "id", "password_hash", "role", "updated_at", "username") SELECT "base_salary", "branch_id", "commission_rate", "created_at", "id", "password_hash", "role", "updated_at", "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE INDEX "users_branch_id_idx" ON "users"("branch_id");
CREATE INDEX "users_role_idx" ON "users"("role");
CREATE INDEX "users_is_active_idx" ON "users"("is_active");
CREATE INDEX "users_created_at_idx" ON "users"("created_at");
CREATE UNIQUE INDEX "users_branch_id_username_key" ON "users"("branch_id", "username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
