/**
 * 로켓그로스 마진 계산 (VAT 포함)
 *
 * 엑셀 수식 기반:
 * discountCoupon = couponDiscount × salesQuantity
 * fee = ROUND((salesAmount - discountCoupon) × feeRate, 0)
 * feeVat = ROUND(fee × 0.1, 0)
 * settlementAmount = salesAmount - fee - feeVat - discountCoupon
 * shippingFee = salesQuantity × fulfillmentFee
 * shippingVat = ROUND(shippingFee × 0.1, 0)
 * payoutAmount = settlementAmount - shippingFee - shippingVat
 * costAmount = costPrice × salesQuantity
 * vat = (salesAmount-discountCoupon) - (salesAmount-discountCoupon)/1.1 - (costAmount-costAmount/1.1) - feeVat - shippingVat
 * margin = payoutAmount - costAmount - vat
 */

export type RGMarginInput = {
  salesAmount: number;
  salesQuantity: number;
  costPrice: number | null;
  feeRate: number | null; // 판매수수료율 (%) - 상품별
  fulfillmentFee: number | null; // 입출고배송비 (개당)
  couponDiscount: number | null; // 판매자할인쿠폰 (개당)
};

export type RGMarginResult = {
  salesAmount: number;
  costAmount: number;
  discountCoupon: number;
  fee: number;
  feeVat: number;
  settlementAmount: number;
  shippingFee: number;
  shippingVat: number;
  payoutAmount: number;
  vat: number;
  margin: number;
  marginRate: number;
  isCalculable: boolean;
};

export function calculateRGMargin(input: RGMarginInput): RGMarginResult {
  const {
    salesAmount,
    salesQuantity,
    costPrice,
    feeRate,
    fulfillmentFee,
    couponDiscount,
  } = input;

  if (costPrice === null || feeRate === null || fulfillmentFee === null) {
    return {
      salesAmount,
      costAmount: 0,
      discountCoupon: 0,
      fee: 0,
      feeVat: 0,
      settlementAmount: 0,
      shippingFee: 0,
      shippingVat: 0,
      payoutAmount: 0,
      vat: 0,
      margin: 0,
      marginRate: 0,
      isCalculable: false,
    };
  }

  const discountCouponAmount = (couponDiscount ?? 0) * salesQuantity;
  const fee = Math.ceil(
    ((salesAmount - discountCouponAmount) * (feeRate / 100)) / 10,
  ) * 10;
  const feeVat = Math.round(fee * 0.1);
  const settlementAmount = salesAmount - fee - feeVat - discountCouponAmount;
  const shippingFee = salesQuantity * fulfillmentFee;
  const shippingVat = Math.round(shippingFee * 0.1);
  const payoutAmount = settlementAmount - shippingFee - shippingVat;
  const costAmount = costPrice * salesQuantity;

  const netSales = salesAmount - discountCouponAmount;
  const vat =
    netSales -
    netSales / 1.1 -
    (costAmount - costAmount / 1.1) -
    feeVat -
    shippingVat;

  const margin = Math.round(payoutAmount - costAmount - vat);
  const marginRate =
    salesAmount > 0 ? Math.round((margin / salesAmount) * 1000) / 10 : 0;

  return {
    salesAmount,
    costAmount,
    discountCoupon: discountCouponAmount,
    fee,
    feeVat,
    settlementAmount,
    shippingFee,
    shippingVat,
    payoutAmount,
    vat,
    margin,
    marginRate,
    isCalculable: true,
  };
}
