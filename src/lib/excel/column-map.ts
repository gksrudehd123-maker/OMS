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
