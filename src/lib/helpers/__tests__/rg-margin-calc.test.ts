import { describe, it, expect } from 'vitest';
import { calculateRGMargin, RGMarginInput } from '../rg-margin-calc';

const baseInput: RGMarginInput = {
  salesAmount: 100000,
  salesQuantity: 10,
  costPrice: 5000,
  feeRate: 10.8,
  fulfillmentFee: 500,
  couponDiscount: null,
};

describe('calculateRGMargin', () => {
  it('기본 마진 계산 (쿠폰 없음)', () => {
    const result = calculateRGMargin(baseInput);

    expect(result.isCalculable).toBe(true);
    expect(result.salesAmount).toBe(100000);
    expect(result.costAmount).toBe(50000); // 5000 * 10
    expect(result.discountCoupon).toBe(0);
    expect(result.fee).toBe(10800); // 100000 * 10.8%
    expect(result.feeVat).toBe(1080); // 10800 * 10%
    expect(result.settlementAmount).toBe(88120); // 100000 - 10800 - 1080 - 0
    expect(result.shippingFee).toBe(5000); // 10 * 500
    expect(result.shippingVat).toBe(500); // 5000 * 10%
    expect(result.payoutAmount).toBe(82620); // 88120 - 5000 - 500
  });

  it('원가 null이면 계산 불가', () => {
    const result = calculateRGMargin({ ...baseInput, costPrice: null });

    expect(result.isCalculable).toBe(false);
    expect(result.margin).toBe(0);
    expect(result.salesAmount).toBe(100000); // salesAmount는 유지
  });

  it('수수료율 null이면 계산 불가', () => {
    const result = calculateRGMargin({ ...baseInput, feeRate: null });

    expect(result.isCalculable).toBe(false);
  });

  it('배송비(fulfillmentFee) null이면 계산 불가', () => {
    const result = calculateRGMargin({ ...baseInput, fulfillmentFee: null });

    expect(result.isCalculable).toBe(false);
  });

  it('쿠폰 할인 적용', () => {
    const result = calculateRGMargin({ ...baseInput, couponDiscount: 1000 });

    expect(result.discountCoupon).toBe(10000); // 1000 * 10개
    // fee = (100000 - 10000) * 10.8% = 9720
    expect(result.fee).toBe(9720);
    expect(result.feeVat).toBe(972);
    // settlement = 100000 - 9720 - 972 - 10000 = 79308
    expect(result.settlementAmount).toBe(79308);
  });

  it('수량 1개 최소 케이스', () => {
    const result = calculateRGMargin({
      salesAmount: 10000,
      salesQuantity: 1,
      costPrice: 5000,
      feeRate: 10.8,
      fulfillmentFee: 500,
      couponDiscount: null,
    });

    expect(result.costAmount).toBe(5000);
    expect(result.fee).toBe(1080);
    expect(result.shippingFee).toBe(500);
  });

  it('salesAmount 0이면 마진율 0', () => {
    const result = calculateRGMargin({
      ...baseInput,
      salesAmount: 0,
      salesQuantity: 0,
    });

    expect(result.marginRate).toBe(0);
  });

  it('VAT 계산이 정확한지 확인', () => {
    const result = calculateRGMargin(baseInput);

    // netSales = 100000
    // vat = 100000 - 100000/1.1 - (50000 - 50000/1.1) - 1080 - 500
    const netSales = 100000;
    const expectedVat =
      netSales - netSales / 1.1 - (50000 - 50000 / 1.1) - 1080 - 500;

    expect(result.vat).toBeCloseTo(expectedVat, 0);
  });
});
