export const SMARTSTORE_COLUMNS: Record<string, string> = {
  상품주문번호: 'productOrderNumber',
  주문번호: 'orderNumber',
  주문일시: 'orderDate',
  주문상태: 'orderStatus',
  배송속성: 'deliveryAttribute',
  '풀필먼트사(주문 기준)': 'fulfillmentCompany',
  클레임상태: 'claimStatus',
  '수량클레임 여부': 'quantityClaim',
  상품번호: 'channelProductId',
  상품명: 'productName',
  옵션정보: 'optionInfo',
  수량: 'quantity',
  구매자명: 'buyerName',
  구매자ID: 'buyerId',
  수취인명: 'recipientName',
  구독신청회차: 'subscriptionRound',
  구독진행회차: 'subscriptionSeq',
};

export const REQUIRED_COLUMNS = [
  '상품주문번호',
  '주문번호',
  '주문일시',
  '주문상태',
  '상품명',
  '수량',
];

// 쿠팡 윙 엑셀 컬럼 매핑 (DeliveryList)
export const COUPANG_COLUMNS: Record<string, string> = {
  주문번호: 'orderNumber',
  묶음배송번호: 'productOrderNumber',
  주문일: 'orderDate',
  등록상품명: 'productName',
  등록옵션명: 'optionInfo',
  '구매수(수량)': 'quantity',
  '옵션판매가(판매단가)': 'unitPrice',
  결제액: 'paymentAmount',
  노출상품ID: 'channelProductId',
  택배사: 'fulfillmentCompany',
  배송유형: 'deliveryAttribute',
  구매자: 'buyerName',
  수취인이름: 'recipientName',
  '출고일(발송일)': 'shipDate',
  배송완료일: 'deliveryDate',
  구매확정일자: 'purchaseDecidedDate',
};

export const COUPANG_REQUIRED_COLUMNS = [
  '주문번호',
  '묶음배송번호',
  '주문일',
  '등록상품명',
  '구매수(수량)',
];
