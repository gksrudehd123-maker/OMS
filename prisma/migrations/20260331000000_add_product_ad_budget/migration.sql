-- CreateTable
CREATE TABLE "product_ad_budgets" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "adCost" DECIMAL(12,2) NOT NULL,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_ad_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_ad_budgets_month_idx" ON "product_ad_budgets"("month");

-- CreateIndex
CREATE INDEX "product_ad_budgets_productId_idx" ON "product_ad_budgets"("productId");

-- CreateIndex
CREATE INDEX "product_ad_budgets_channelId_idx" ON "product_ad_budgets"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "product_ad_budgets_month_channelId_productId_key" ON "product_ad_budgets"("month", "channelId", "productId");

-- AddForeignKey
ALTER TABLE "product_ad_budgets" ADD CONSTRAINT "product_ad_budgets_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_ad_budgets" ADD CONSTRAINT "product_ad_budgets_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
