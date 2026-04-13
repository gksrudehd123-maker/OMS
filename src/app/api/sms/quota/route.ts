import { requireAuth, isError } from '@/lib/auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getRemainingQuota } from '@/lib/aligo';

export async function GET() {
  const user = await requireAuth();
  if (isError(user)) return user;

  try {
    const result = await getRemainingQuota();
    if (Number(result.result_code) !== 1) {
      return apiError(result.message || '잔여 건수 조회 실패', 502);
    }
    return apiSuccess({
      sms: result.SMS_CNT ?? 0,
      lms: result.LMS_CNT ?? 0,
      mms: result.MMS_CNT ?? 0,
    });
  } catch (err) {
    console.error('SMS quota error:', err);
    const msg = err instanceof Error ? err.message : '잔여 건수 조회 실패';
    return apiError(msg, 500);
  }
}
