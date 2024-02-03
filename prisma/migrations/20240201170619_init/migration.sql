-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "totalCurrency" TEXT NOT NULL,
    "userId" TEXT,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("id", "orderId", "totalAmount", "totalCurrency", "userId") SELECT "id", "orderId", "totalAmount", "totalCurrency", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderId_key" ON "Order"("orderId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
