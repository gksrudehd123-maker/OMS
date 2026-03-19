import { prisma } from '@/lib/prisma';
import { ParsedDailySales } from '@/lib/excel/rocketgrowth-parser';

export type DailySalesProcessResult = {
  successCount: number;
  errors: { row: number; message: string }[];
  newProductIds: Set<string>;
};

/**
 * 로켓그로스 DailySales 처리
 * order-processor 패턴과 동일하게 상품 조회/생성 후 DailySales 레코드 생성
 */
export async function processDailySales(
  parsedSales: ParsedDailySales[],
  channelId: string,
  uploadId: string,
  salesDate: Date,
  initialErrors: { row: number; message: string }[] = [],
): Promise<DailySalesProcessResult> {
  let successCount = 0;
  const errors = [...initialErrors];
  const newProductIds = new Set<string>();

  for (const sale of parsedSales) {
    try {
      // 상품 조회 후 없으면 생성
      let product = await prisma.product.findUnique({
        where: { productKey: sale.productKey },
      });
      const isNew = !product;
      if (!product) {
        product = await prisma.product.create({
          data: {
            name: sale.optionName,
            optionInfo: '',
            productKey: sale.productKey,
            shippingCost: 0,
          },
        });
      }
      if (isNew) {
        newProductIds.add(product.id);
      }

      // DailySales 레코드 생성 (중복 무시)
      await prisma.dailySales.create({
        data: {
          date: salesDate,
          optionId: sale.optionId,
          exposureProductId: sale.exposureProductId,
          optionName: sale.optionName,
          productType: sale.productType,
          categoryName: sale.categoryName,
          itemWinnerRate: sale.itemWinnerRate,
          salesAmount: sale.salesAmount,
          salesQuantity: sale.salesQuantity,
          totalAmount: sale.totalAmount,
          totalQuantity: sale.totalQuantity,
          cancelAmount: sale.cancelAmount,
          cancelQuantity: sale.cancelQuantity,
          immediateCancelQuantity: sale.immediateCancelQuantity,
          productId: product.id,
          channelId,
          uploadId,
        },
      });
      successCount++;
    } catch (err: unknown) {
      const prismaError = err as { code?: string };
      if (prismaError.code === 'P2002') {
        errors.push({
          row: 0,
          message: `중복 데이터: 옵션ID ${sale.optionId}`,
        });
      } else {
        errors.push({
          row: 0,
          message: `저장 오류: 옵션ID ${sale.optionId}`,
        });
      }
    }
  }

  return { successCount, errors, newProductIds };
}
