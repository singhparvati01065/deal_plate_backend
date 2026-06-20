-- CreateTable
CREATE TABLE "CateringPackage" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pricePerPerson" DOUBLE PRECISION,
    "minGuests" INTEGER,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CateringPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CateringRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "packageId" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "guests" INTEGER NOT NULL,
    "message" TEXT,
    "contactPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CateringRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CateringPackage_restaurantId_idx" ON "CateringPackage"("restaurantId");

-- CreateIndex
CREATE INDEX "CateringRequest_restaurantId_idx" ON "CateringRequest"("restaurantId");

-- CreateIndex
CREATE INDEX "CateringRequest_userId_idx" ON "CateringRequest"("userId");

-- AddForeignKey
ALTER TABLE "CateringPackage" ADD CONSTRAINT "CateringPackage_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CateringRequest" ADD CONSTRAINT "CateringRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CateringRequest" ADD CONSTRAINT "CateringRequest_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CateringRequest" ADD CONSTRAINT "CateringRequest_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CateringPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
