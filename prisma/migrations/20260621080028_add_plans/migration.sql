-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL DEFAULT 'per month',
    "description" TEXT NOT NULL DEFAULT '',
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "promoLimit" INTEGER NOT NULL DEFAULT 2,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_key_key" ON "Plan"("key");
