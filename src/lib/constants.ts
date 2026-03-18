export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'OMS';
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const CHANNELS = {
  COUPANG: '쿠팡',
  NAVER: '네이버',
  ELEVEN_ST: '11번가',
  GMARKET: 'G마켓',
  AUCTION: '옥션',
} as const;

export const CURRENCY_FORMAT = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
});

export const PERCENT_FORMAT = new Intl.NumberFormat('ko-KR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
