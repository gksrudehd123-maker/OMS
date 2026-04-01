/**
 * 주문 상태 / 배송 속성 영문 코드 ↔ 한글 매핑
 * 기준: 네이버 커머스 API 영문 코드
 * 엑셀 업로드 시 한글 → 영문 변환, 화면 표시 시 영문 → 한글 변환
 */

// 주문 상태
export const ORDER_STATUS_KO_TO_EN: Record<string, string> = {
  결제완료: 'PAYED',
  상품준비중: 'PRODUCT_PREPARE',
  배송준비중: 'DELIVERING',
  배송중: 'DELIVERING',
  발송완료: 'DELIVERING',
  배송완료: 'DELIVERED',
  구매확정: 'PURCHASE_DECIDED',
  취소: 'CANCELED',
  반품: 'RETURNED',
  교환: 'EXCHANGED',
  // 쿠팡 주문 상태
  출고: 'DELIVERING',
  출고완료: 'DELIVERING',
};

export const ORDER_STATUS_EN_TO_KO: Record<string, string> = {
  PAYED: '결제완료',
  PAYMENT_WAITING: '입금대기',
  PRODUCT_PREPARE: '상품준비중',
  DELIVERING: '배송중',
  DELIVERED: '배송완료',
  PURCHASE_DECIDED: '구매확정',
  CANCELED: '취소',
  RETURNED: '반품',
  EXCHANGED: '교환',
  CANCEL_DONE: '취소완료',
};

// 배송 속성
export const DELIVERY_ATTR_KO_TO_EN: Record<string, string> = {
  일반배송: 'NORMAL',
  N배송: 'NORMAL',
  오늘출발: 'TODAY',
  '내일 도착 보장': 'ARRIVAL_GUARANTEE',
  도착보장: 'ARRIVAL_GUARANTEE',
  당일발송: 'TODAY',
  새벽배송: 'DAWN',
  // 쿠팡 배송 유형
  '판매자 배송': 'NORMAL',
  로켓배송: 'ROCKET',
  로켓그로스: 'ROCKET_GROWTH',
};

export const DELIVERY_ATTR_EN_TO_KO: Record<string, string> = {
  NORMAL: '일반배송',
  TODAY: '오늘출발',
  ARRIVAL_GUARANTEE: '도착보장',
  DAWN: '새벽배송',
  ROCKET: '로켓배송',
  ROCKET_GROWTH: '로켓그로스',
};

/** 매출 합산에서 제외할 주문 상태 */
export const EXCLUDED_ORDER_STATUSES = [
  'CANCELED',
  'CANCEL_DONE',
  'RETURNED',
  'EXCHANGED',
];

/**
 * 주문 상태를 영문 코드로 정규화
 * 이미 영문이면 그대로, 한글이면 변환
 */
export function normalizeOrderStatus(status: string): string {
  // 이미 영문 코드인 경우
  if (ORDER_STATUS_EN_TO_KO[status]) return status;
  // 한글 → 영문
  return ORDER_STATUS_KO_TO_EN[status] || status;
}

/**
 * 배송 속성을 영문 코드로 정규화
 */
export function normalizeDeliveryAttribute(attr: string | null): string | null {
  if (!attr) return null;
  if (DELIVERY_ATTR_EN_TO_KO[attr]) return attr;
  return DELIVERY_ATTR_KO_TO_EN[attr] || attr;
}

/**
 * 주문 상태를 한글로 표시
 */
export function displayOrderStatus(status: string): string {
  return ORDER_STATUS_EN_TO_KO[status] || status;
}

/**
 * 배송 속성을 한글로 표시
 */
export function displayDeliveryAttribute(attr: string | null): string {
  if (!attr) return '-';
  return DELIVERY_ATTR_EN_TO_KO[attr] || attr;
}
