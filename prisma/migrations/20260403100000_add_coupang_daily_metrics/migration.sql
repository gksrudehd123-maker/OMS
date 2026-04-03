-- CreateTable
CREATE TABLE "coupang_daily_metrics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "optionId" TEXT NOT NULL,
    "registeredProductId" TEXT,
    "optionName" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "categoryName" TEXT,
    "salesMethod" TEXT,
    "salesAmount" DECIMAL(12,2) NOT NULL,
    "orderCount" INTEGER NOT NULL,
    "salesQuantity" INTEGER NOT NULL,
    "visitors" INTEGER,
    "views" INTEGER,
    "cart" INTEGER,
    "conversionRate" DECIMAL(5,2),
    "itemWinnerRate" DECIMAL(5,2),
    "totalAmount" DECIMAL(12,2),
    "totalQuantity" INTEGER,
    "cancelAmount" DECIMAL(12,2),
    "cancelQuantity" INTEGER,
    "immediateCancelQuantity" INTEGER,
    "productId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupang_daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coupang_daily_metrics_date_optionId_channelId_key" ON "coupang_daily_metrics"("date", "optionId", "channelId");

-- CreateIndex
CREATE INDEX "coupang_daily_metrics_date_idx" ON "coupang_daily_metrics"("date");

-- CreateIndex
CREATE INDEX "coupang_daily_metrics_productId_idx" ON "coupang_daily_metrics"("productId");

-- CreateIndex
CREATE INDEX "coupang_daily_metrics_channelId_idx" ON "coupang_daily_metrics"("channelId");

-- CreateIndex
CREATE INDEX "coupang_daily_metrics_uploadId_idx" ON "coupang_daily_metrics"("uploadId");

-- AddForeignKey
ALTER TABLE "coupang_daily_metrics" ADD CONSTRAINT "coupang_daily_metrics_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupang_daily_metrics" ADD CONSTRAINT "coupang_daily_metrics_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupang_daily_metrics" ADD CONSTRAINT "coupang_daily_metrics_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
