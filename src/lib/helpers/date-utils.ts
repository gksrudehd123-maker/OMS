/**
 * UTC Date를 KST(UTC+9) 날짜 문자열로 변환
 * DB에 UTC로 저장된 날짜를 한국 기준 YYYY-MM-DD로 변환할 때 사용
 */
export function toKSTDateString(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0];
}
