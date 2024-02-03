/*
  Warnings:

  - You are about to drop the column `orderId` on the `Product` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("orderId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("productId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceAmount" REAL NOT NULL,
    "priceCurrency" TEXT NOT NULL
);
INSERT INTO "new_Product" ("id", "name", "priceAmount", "priceCurrency", "productId") SELECT "id", "name", "priceAmount", "priceCurrency", "productId" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_productId_key" ON "Product"("productId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
