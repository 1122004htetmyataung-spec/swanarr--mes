-- CreateTable
CREATE TABLE "service_ticket_parts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticket_id" TEXT NOT NULL,
    "inventory_id" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit_price" REAL NOT NULL,
    "total_price" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_ticket_parts_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "service_tickets" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "service_ticket_parts_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "inventory_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "service_ticket_status_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticket_id" TEXT NOT NULL,
    "old_status" TEXT NOT NULL,
    "new_status" TEXT NOT NULL,
    "changed_by" TEXT,
    "reason" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_ticket_status_history_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "service_tickets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_service_tickets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branch_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "technician_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "description" TEXT NOT NULL,
    "device_name" TEXT,
    "device_brand" TEXT,
    "device_model" TEXT,
    "device_serial_number" TEXT,
    "price_type" TEXT NOT NULL,
    "estimated_cost" REAL NOT NULL DEFAULT 0,
    "service_charge" REAL NOT NULL DEFAULT 0,
    "parts_cost" REAL NOT NULL DEFAULT 0,
    "total_cost" REAL NOT NULL DEFAULT 0,
    "warranty_terms" TEXT NOT NULL DEFAULT '',
    "estimated_completion_date" DATETIME,
    "completion_date" DATETIME,
    "internal_notes" TEXT NOT NULL DEFAULT '',
    "customer_signature" TEXT,
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
CREATE INDEX "service_tickets_customer_id_idx" ON "service_tickets"("customer_id");
CREATE INDEX "service_tickets_status_idx" ON "service_tickets"("status");
CREATE INDEX "service_tickets_created_at_idx" ON "service_tickets"("created_at");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "service_ticket_parts_ticket_id_idx" ON "service_ticket_parts"("ticket_id");

-- CreateIndex
CREATE INDEX "service_ticket_parts_inventory_id_idx" ON "service_ticket_parts"("inventory_id");

-- CreateIndex
CREATE INDEX "service_ticket_status_history_ticket_id_idx" ON "service_ticket_status_history"("ticket_id");

-- CreateIndex
CREATE INDEX "service_ticket_status_history_timestamp_idx" ON "service_ticket_status_history"("timestamp");
