-- CreateTable
CREATE TABLE "cs_product_options" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER,
    "contents" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cs_product_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cs_product_options_productId_idx" ON "cs_product_options"("productId");

-- AddForeignKey
ALTER TABLE "cs_product_options" ADD CONSTRAINT "cs_product_options_productId_fkey" FOREIGN KEY ("productId") REFERENCES "cs_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
