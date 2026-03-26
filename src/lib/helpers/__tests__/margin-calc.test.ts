import { describe, it, expect } from 'vitest';
import { calculateMargin, MarginInput } from '../margin-calc';

const baseInput: MarginInput = {
  sellingPrice: 30000,
  costPrice: 15000,
  quantity: 1,
  feeRate: 6,
  productFeeRate: null,
  shippingCost: 3000,
  freeShippingMin: 50000,
  orderTotal: 30000,
  isAnyFreeShipping: false,
};

describe('calculateMargin', () => {
  it('기본 마진 계산', () => {
    const result = calculateMargin(baseInput);

    expect(result.isCalculable).toBe(true);
    expect(result.salesAmount).toBe(30000);
    expect(result.costAmount).toBe(15000);
    expect(result.fee).toBe(1800); // 30000 * 6%
    expect(result.shipping).toBe(3000);
    expect(result.margin).toBe(10200); // 30000 - 15000 - 1800 - 3000
  });

  it('판매가가 null이면 계산 불가', () => {
    const result = calculateMargin({ ...baseInput, sellingPrice: null });

    expect(result.isCalculable).toBe(false);
    expect(result.margin).toBe(0);
  });

  it('원가가 null이면 계산 불가', () => {
    const result = calculateMargin({ ...baseInput, costPrice: null });

    expect(result.isCalculable).toBe(false);
    expect(result.margin).toBe(0);
  });

  it('수량 2개 이상', () => {
    const result = calculateMargin({ ...baseInput, quantity: 3 });

    expect(result.salesAmount).toBe(90000);
    expect(result.costAmount).toBe(45000);
    expect(result.fee).toBe(5400); // 90000 * 6%
  });

  it('주문 합산금액이 무료배송 기준 이상이면 배송비 0', () => {
    const result = calculateMargin({ ...baseInput, orderTotal: 50000 });

    expect(result.shipping).toBe(0);
    expect(result.margin).toBe(13200); // 30000 - 15000 - 1800 - 0
  });

  it('같은 주문 내 다른 상품이 무료배송이면 배송비 0', () => {
    const result = calculateMargin({ ...baseInput, isAnyFreeShipping: true });

    expect(result.shipping).toBe(0);
  });

  it('무료배송 기준금액이 null이면 항상 배송비 부과', () => {
    const result = calculateMargin({
      ...baseInput,
      freeShippingMin: null,
      orderTotal: 100000,
    });

    expect(result.shipping).toBe(3000);
  });

  it('상품별 수수료율이 설정되면 채널 수수료 대신 사용', () => {
    const result = calculateMargin({ ...baseInput, productFeeRate: 10 });

    expect(result.fee).toBe(3000); // 30000 * 10%
  });

  it('마진율 계산 (소수점 1자리)', () => {
    const result = calculateMargin(baseInput);

    // margin=10200, salesAmount=30000 → 34%
    expect(result.marginRate).toBe(34);
  });

  it('판매가 0이면 마진율 0', () => {
    const result = calculateMargin({
      ...baseInput,
      sellingPrice: 0,
      costPrice: 0,
    });

    expect(result.marginRate).toBe(0);
  });
});
