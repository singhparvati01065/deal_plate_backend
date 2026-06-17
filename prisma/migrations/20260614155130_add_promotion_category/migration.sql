-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN     "category" TEXT;

-- CreateIndex
CREATE INDEX "Promotion_category_idx" ON "Promotion"("category");
