/**
 * 주문별 마진 계산
 *
 * 마진 = (판매가 × 수량) - (원가 × 수량) - 수수료 - 배송비
 * 수수료 = 판매가 × 수량 × (수수료율 / 100)
 * 배송비 = 같은 주문번호 합산금액 기준 조건부 무료배송 판단
 */

export type MarginInput = {
  sellingPrice: number | null;
  costPrice: number | null;
  quantity: number;
  feeRate: number; // 채널 수수료율 (%)
  shippingCost: number; // 상품 기본 배송비
  freeShippingMin: number | null; // 무료배송 기준금액
  orderTotal: number; // 같은 주문번호 합산금액
  isAnyFreeShipping: boolean; // 같은 주문 내 어떤 상품이든 무료배송 조건 충족 여부
};

export type MarginResult = {
  salesAmount: number; // 판매가 × 수량
  costAmount: number; // 원가 × 수량
  fee: number; // 수수료
  shipping: number; // 배송비 (주문 내 상품 수로 배분)
  margin: number; // 순마진
  marginRate: number; // 마진율 (%)
  isCalculable: boolean; // 판매가/원가 설정 여부
};

export function calculateMargin(input: MarginInput): MarginResult {
  const {
    sellingPrice,
    costPrice,
    quantity,
    feeRate,
    shippingCost,
    freeShippingMin,
    orderTotal,
    isAnyFreeShipping,
  } = input;

  if (sellingPrice === null || costPrice === null) {
    return {
      salesAmount: 0,
      costAmount: 0,
      fee: 0,
      shipping: 0,
      margin: 0,
      marginRate: 0,
      isCalculable: false,
    };
  }

  const salesAmount = sellingPrice * quantity;
  const costAmount = costPrice * quantity;
  const fee = Math.round(salesAmount * (feeRate / 100));

  // 배송비 판단
  let shipping = shippingCost;
  if (isAnyFreeShipping) {
    // 같은 주문 내 어떤 상품이든 무료배송 조건 충족
    shipping = 0;
  } else if (freeShippingMin !== null && orderTotal >= freeShippingMin) {
    // 이 상품 자체의 무료배송 조건 충족
    shipping = 0;
  }

  const margin = salesAmount - costAmount - fee - shipping;
  const marginRate = salesAmount > 0 ? (margin / salesAmount) * 100 : 0;

  return {
    salesAmount,
    costAmount,
    fee,
    shipping,
    margin,
    marginRate,
    isCalculable: true,
  };
}
