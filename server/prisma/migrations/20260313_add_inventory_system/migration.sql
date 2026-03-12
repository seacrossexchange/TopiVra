-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'INVALID');

-- CreateTable
CREATE TABLE "product_inventories" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "accountData" TEXT NOT NULL,
    "accountHash" TEXT NOT NULL,
    "accountInfo" JSONB,
    "status" "InventoryStatus" NOT NULL DEFAULT 'AVAILABLE',
    "orderId" TEXT,
    "orderItemId" TEXT,
    "soldAt" TIMESTAMP(3),
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "invalidReason" TEXT,
    "invalidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_inventories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_inventories_accountHash_key" ON "product_inventories"("accountHash");

-- CreateIndex
CREATE INDEX "product_inventories_productId_status_idx" ON "product_inventories"("productId", "status");

-- CreateIndex
CREATE INDEX "product_inventories_sellerId_status_idx" ON "product_inventories"("sellerId", "status");

-- CreateIndex
CREATE INDEX "product_inventories_accountHash_idx" ON "product_inventories"("accountHash");

-- CreateIndex
CREATE INDEX "product_inventories_orderId_idx" ON "product_inventories"("orderId");

-- AddForeignKey
ALTER TABLE "product_inventories" ADD CONSTRAINT "product_inventories_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_inventories" ADD CONSTRAINT "product_inventories_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_inventories" ADD CONSTRAINT "product_inventories_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_inventories" ADD CONSTRAINT "product_inventories_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Add new fields to products table
ALTER TABLE "products" ADD COLUMN "autoDeliver" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "products" ADD COLUMN "inventoryCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Add new fields to order_items table
ALTER TABLE "order_items" ADD COLUMN "inventoryId" TEXT;
ALTER TABLE "order_items" ADD COLUMN "autoDelivered" BOOLEAN NOT NULL DEFAULT false;

