// 알리고 SMS REST 클라이언트 (패키지 미사용, fetch 직접 호출)
// 문서: https://smartsms.aligo.in/admin/api/spec.html

const ALIGO_BASE_URL = 'https://apis.aligo.in';

export type SmsMsgType = 'SMS' | 'LMS' | 'MMS';

export interface AligoSendParams {
  receiver: string | string[]; // 수신자 (콤마 구분 또는 배열, 최대 1000명)
  msg: string;
  title?: string; // LMS/MMS 제목
  sender?: string; // 발신번호 (미지정 시 env)
  msgType?: SmsMsgType; // 미지정 시 바이트 수로 자동 판별
  testMode?: boolean; // true면 testmode_yn=Y (과금 없음)
}

export interface AligoSendResult {
  result_code: number; // 1: 성공, 음수: 실패
  message: string;
  msg_id?: number;
  success_cnt?: number;
  error_cnt?: number;
  msg_type?: string;
}

export interface AligoQuotaResult {
  result_code: number;
  message: string;
  SMS_CNT?: number;
  LMS_CNT?: number;
  MMS_CNT?: number;
}

/**
 * 문자열의 바이트 수 계산 (EUC-KR 기준, 한글 2바이트)
 * 알리고 기준: SMS 90바이트, LMS 2000바이트, MMS 2000바이트
 */
export function getByteLength(str: string): number {
  let bytes = 0;
  for (const ch of str) {
    bytes += /[\x00-\x7F]/.test(ch) ? 1 : 2;
  }
  return bytes;
}

/**
 * 바이트 수로 SMS/LMS 자동 판별
 * - 90바이트 이하: SMS
 * - 초과: LMS
 */
export function detectMsgType(msg: string): Exclude<SmsMsgType, 'MMS'> {
  return getByteLength(msg) <= 90 ? 'SMS' : 'LMS';
}

function getCredentials() {
  const apiKey = process.env.ALIGO_API_KEY;
  const userId = process.env.ALIGO_USER_ID;
  const sender = process.env.ALIGO_SENDER;
  if (!apiKey || !userId || !sender) {
    throw new Error(
      'ALIGO_API_KEY / ALIGO_USER_ID / ALIGO_SENDER 환경 변수 필요',
    );
  }
  return { apiKey, userId, sender };
}

/** 문자 발송 */
export async function sendSms(
  params: AligoSendParams,
): Promise<AligoSendResult> {
  const { apiKey, userId, sender: defaultSender } = getCredentials();
  const sender = params.sender || defaultSender;
  const receiver = Array.isArray(params.receiver)
    ? params.receiver.join(',')
    : params.receiver;
  const msgType = params.msgType || detectMsgType(params.msg);

  const envTestMode = process.env.ALIGO_TEST_MODE === 'true';
  const testMode = params.testMode ?? envTestMode;

  const form = new URLSearchParams();
  form.set('key', apiKey);
  form.set('user_id', userId);
  form.set('sender', sender);
  form.set('receiver', receiver);
  form.set('msg', params.msg);
  form.set('msg_type', msgType);
  if (params.title) form.set('title', params.title);
  if (testMode) form.set('testmode_yn', 'Y');

  const res = await fetch(`${ALIGO_BASE_URL}/send/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  if (!res.ok) {
    throw new Error(`알리고 HTTP 에러: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as AligoSendResult;
  return json;
}

/** 잔여 건수 조회 */
export async function getRemainingQuota(): Promise<AligoQuotaResult> {
  const { apiKey, userId } = getCredentials();

  const form = new URLSearchParams();
  form.set('key', apiKey);
  form.set('user_id', userId);

  const res = await fetch(`${ALIGO_BASE_URL}/remain/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  if (!res.ok) {
    throw new Error(`알리고 HTTP 에러: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as AligoQuotaResult;
}
