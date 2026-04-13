import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';
import { writeAuditLog } from '@/lib/audit-log';
import { sendSms, detectMsgType } from '@/lib/aligo';

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (isError(user)) return user;

  try {
    const body = await request.json();
    const { recipient, msg, title, templateId, testMode } = body as {
      recipient?: string;
      msg?: string;
      title?: string;
      templateId?: string;
      testMode?: boolean;
    };

    if (!recipient?.trim() || !msg?.trim()) {
      return apiError('수신자와 본문은 필수입니다');
    }

    const cleanedRecipient = recipient.replace(/-/g, '').trim();
    if (!/^\d{9,11}$/.test(cleanedRecipient)) {
      return apiError('올바른 전화번호 형식이 아닙니다');
    }

    const msgType = detectMsgType(msg);

    let result;
    let status: 'SUCCESS' | 'FAIL' = 'SUCCESS';
    let resultCode: string | undefined;
    let resultMsg: string | undefined;
    let msgId: string | undefined;

    try {
      result = await sendSms({
        receiver: cleanedRecipient,
        msg,
        title,
        msgType,
        testMode,
      });
      resultCode = String(result.result_code);
      resultMsg = result.message;
      msgId = result.msg_id !== undefined ? String(result.msg_id) : undefined;
      if (result.result_code !== 1) status = 'FAIL';
    } catch (err) {
      status = 'FAIL';
      resultMsg = err instanceof Error ? err.message : String(err);
    }

    const sender = process.env.ALIGO_SENDER || '';
    const envTestMode = process.env.ALIGO_TEST_MODE === 'true';
    const effectiveTestMode = testMode ?? envTestMode;

    const log = await prisma.smsLog.create({
      data: {
        recipient: cleanedRecipient,
        sender,
        body: msg,
        msgType,
        title: title || null,
        templateId: templateId || null,
        status,
        resultCode: resultCode || null,
        resultMsg: resultMsg || null,
        msgId: msgId || null,
        testMode: effectiveTestMode,
        userId: user.id,
        userName: user.name,
      },
    });

    await writeAuditLog({
      userId: user.id,
      userName: user.name,
      action: 'CREATE',
      target: 'SmsLog',
      targetId: log.id,
      summary: `SMS 발송 ${status === 'SUCCESS' ? '성공' : '실패'} — ${cleanedRecipient} (${msgType}${effectiveTestMode ? ', 테스트' : ''})`,
    });

    if (status === 'FAIL') {
      return apiError(resultMsg || '발송 실패', 502);
    }

    return apiSuccess({ log, result });
  } catch (err) {
    console.error('SMS send error:', err);
    return apiError('SMS 발송 중 오류가 발생했습니다', 500);
  }
}
