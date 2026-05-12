-- CreateTable
CREATE TABLE "ShopVerificationDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'OTHER',
    "caption" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShopVerificationDocument_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "BarberShop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BarberShop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "description" TEXT,
    "phone" TEXT,
    "openingTime" TEXT NOT NULL DEFAULT '09:00',
    "closingTime" TEXT NOT NULL DEFAULT '18:00',
    "coverImage" TEXT,
    "logo" TEXT,
    "rating" REAL NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "latitude" REAL,
    "longitude" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "verificationNotes" TEXT,
    "verifiedAt" DATETIME,
    "verifiedBy" TEXT,
    CONSTRAINT "BarberShop_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_BarberShop" ("address", "closingTime", "coverImage", "createdAt", "description", "id", "latitude", "logo", "longitude", "name", "openingTime", "ownerId", "phone", "rating", "reviewCount") SELECT "address", "closingTime", "coverImage", "createdAt", "description", "id", "latitude", "logo", "longitude", "name", "openingTime", "ownerId", "phone", "rating", "reviewCount" FROM "BarberShop";
DROP TABLE "BarberShop";
ALTER TABLE "new_BarberShop" RENAME TO "BarberShop";
CREATE UNIQUE INDEX "BarberShop_ownerId_key" ON "BarberShop"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Grandfather any shops that already existed before this migration ran:
-- they were created before verification existed, so mark them VERIFIED.
-- (New shops created AFTER this migration default to PENDING.)
UPDATE "BarberShop" SET "verificationStatus" = 'VERIFIED', "verifiedAt" = CURRENT_TIMESTAMP;
