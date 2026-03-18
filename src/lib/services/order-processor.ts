import { prisma } from '@/lib/prisma';
import { ParsedOrder } from '@/lib/excel/smartstore-parser';

export type ProcessResult = {
  successCount: number;
  errors: { row: number; message: string }[];
  newProductIds: Set<string>;
};

/**
 * 공통 주문 처리 로직
 * 엑셀 업로드, API 자동수집 모두 이 함수를 통해 DB에 저장
 */
export async function processOrders(
  parsedOrders: ParsedOrder[],
  channelId: string,
  uploadId: string,
  initialErrors: { row: number; message: string }[] = [],
): Promise<ProcessResult> {
  // 기본값 설정 조회
  const defaultSettings = await prisma.setting.findMany({
    where: { key: { in: ['defaultShippingCost', 'defaultFreeShippingMin'] } },
  });
  const defaults: Record<string, string> = {};
  for (const s of defaultSettings) {
    defaults[s.key] = s.value;
  }

  let successCount = 0;
  const errors = [...initialErrors];
  const newProductIds = new Set<string>();

  for (const order of parsedOrders) {
    try {
      // 상품 조회 후 없으면 생성
      let product = await prisma.product.findUnique({
        where: { productKey: order.productKey },
      });
      const isNew = !product;
      if (!product) {
        const shippingCost = defaults.defaultShippingCost
          ? parseFloat(defaults.defaultShippingCost)
          : 0;
        const freeShippingMin = defaults.defaultFreeShippingMin
          ? parseFloat(defaults.defaultFreeShippingMin)
          : null;

        product = await prisma.product.create({
          data: {
            name: order.productName,
            optionInfo: order.optionInfo,
            productKey: order.productKey,
            shippingCost,
            freeShippingMin,
          },
        });
      }
      if (isNew) {
        newProductIds.add(product.id);
      }

      // 주문 생성 (중복 무시)
      await prisma.order.create({
        data: {
          productOrderNumber: order.productOrderNumber,
          orderNumber: order.orderNumber,
          orderDate: order.orderDate,
          orderStatus: order.orderStatus,
          deliveryAttribute: order.deliveryAttribute,
          fulfillmentCompany: order.fulfillmentCompany,
          claimStatus: order.claimStatus,
          quantityClaim: order.quantityClaim,
          channelProductId: order.channelProductId,
          productName: order.productName,
          optionInfo: order.optionInfo,
          quantity: order.quantity,
          buyerName: order.buyerName,
          buyerId: order.buyerId,
          recipientName: order.recipientName,
          subscriptionRound: order.subscriptionRound,
          subscriptionSeq: order.subscriptionSeq,
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
          message: `중복 주문: ${order.productOrderNumber}`,
        });
      } else {
        errors.push({
          row: 0,
          message: `저장 오류: ${order.productOrderNumber}`,
        });
      }
    }
  }

  return { successCount, errors, newProductIds };
}
