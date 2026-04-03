/**
 * @db.Date 컬럼의 날짜를 YYYY-MM-DD 문자열로 변환
 * DB에 KST 날짜가 UTC 00:00:00으로 저장되어 있으므로 그대로 추출
 */
export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * UTC Date를 KST(UTC+9) 날짜 문자열로 변환
 * @deprecated toKSTDate()로 저장 시 변환 후 toDateString() 사용 권장
 */
export function toKSTDateString(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0];
}

/**
 * UTC Date를 KST 기준 날짜(시간 제거)로 변환
 * @db.Date 컬럼에 저장할 때 사용 — KST 기준 YYYY-MM-DD를 UTC Date로 반환
 */
export function toKSTDate(date: Date): Date {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()),
  );
}

/**
 * 날짜 문자열(YYYY-MM-DD)을 @db.Date용 UTC Date로 변환
 * API 쿼리 파라미터 → DB 필터 변환에 사용
 */
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * KST 기준 오늘 날짜를 YYYY-MM-DD 문자열로 반환
 */
export function todayKST(): string {
  return toKSTDateString(new Date());
}
