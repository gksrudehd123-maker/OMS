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

// 쿠팡 로켓그로스 판매통계 엑셀 컬럼 매핑
export const ROCKETGROWTH_COLUMNS: Record<string, string> = {
  노출상품ID: 'exposureProductId',
  옵션ID: 'optionId',
  옵션명: 'optionName',
  상품타입: 'productType',
  카테고리: 'categoryName',
  '아이템위너 비율(%)': 'itemWinnerRate',
};

// startsWith 매칭이 필요한 컬럼 (헤더에 부연 설명 포함)
export const ROCKETGROWTH_PREFIX_COLUMNS: Record<string, string> = {
  '순 판매 금액': 'salesAmount',
  '순 판매 상품 수': 'salesQuantity',
  '전체 거래 금액': 'totalAmount',
  '전체 거래 상품 수': 'totalQuantity',
  '총 취소 금액': 'cancelAmount',
  '총 취소 상품 수': 'cancelQuantity',
  '즉시 취소 상품 수': 'immediateCancelQuantity',
};

export const ROCKETGROWTH_REQUIRED_COLUMNS = ['옵션ID', '옵션명'];
