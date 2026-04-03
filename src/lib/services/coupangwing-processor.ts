import { prisma } from '@/lib/prisma';
import { ParsedCoupangWingMetrics } from '@/lib/excel/coupangwing-parser';

export type CWProcessResult = {
  successCount: number;
  errors: { row: number; message: string }[];
  newProductIds: Set<string>;
};

/**
 * 쿠팡 윙 SELLER_INSIGHTS 처리
 * dailysales-processor 패턴과 동일하게 상품 조회/생성 후 CoupangDailyMetrics 레코드 생성
 */
export async function processCoupangWingMetrics(
  parsedMetrics: ParsedCoupangWingMetrics[],
  channelId: string,
  uploadId: string,
  salesDate: Date,
  initialErrors: { row: number; message: string }[] = [],
): Promise<CWProcessResult> {
  let successCount = 0;
  const errors = [...initialErrors];
  const newProductIds = new Set<string>();

  for (const m of parsedMetrics) {
    try {
      // 판매가 자동 계산 (salesAmount / salesQuantity)
      const autoSellingPrice =
        m.salesQuantity > 0
          ? Math.round(m.salesAmount / m.salesQuantity)
          : null;

      let product = await prisma.product.findUnique({
        where: { productKey: m.productKey },
      });
      const isNew = !product;
      if (!product) {
        product = await prisma.product.create({
          data: {
            name: m.optionName,
            optionInfo: '',
            productKey: m.productKey,
            shippingCost: 0,
            sellingPrice: autoSellingPrice,
            fulfillmentFee: 0,
            couponDiscount: 0,
          },
        });
      } else if (autoSellingPrice && !product.sellingPrice) {
        product = await prisma.product.update({
          where: { id: product.id },
          data: { sellingPrice: autoSellingPrice },
        });
      }
      if (isNew) {
        newProductIds.add(product.id);
      }

      await prisma.coupangDailyMetrics.create({
        data: {
          date: salesDate,
          optionId: m.optionId,
          registeredProductId: m.registeredProductId,
          optionName: m.optionName,
          productName: m.productName,
          categoryName: m.categoryName,
          salesMethod: m.salesMethod,
          salesAmount: m.salesAmount,
          orderCount: m.orderCount,
          salesQuantity: m.salesQuantity,
          visitors: m.visitors,
          views: m.views,
          cart: m.cart,
          conversionRate: m.conversionRate,
          itemWinnerRate: m.itemWinnerRate,
          totalAmount: m.totalAmount,
          totalQuantity: m.totalQuantity,
          cancelAmount: m.cancelAmount,
          cancelQuantity: m.cancelQuantity,
          immediateCancelQuantity: m.immediateCancelQuantity,
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
          message: `중복 데이터: 옵션ID ${m.optionId}`,
        });
      } else {
        errors.push({
          row: 0,
          message: `저장 오류: 옵션ID ${m.optionId}`,
        });
      }
    }
  }

  return { successCount, errors, newProductIds };
}
