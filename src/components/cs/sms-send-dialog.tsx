'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Send } from 'lucide-react';

type MessageTemplate = {
  id: string;
  title: string;
  body: string;
  channel: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  defaultRecipient?: string;
  defaultVariables?: Record<string, string>;
  defaultBody?: string; // 재발송용 — 설정 시 템플릿 선택 불가
};

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(.+?)\}\}/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, ''))));
}

function getByteLength(str: string): number {
  let bytes = 0;
  for (const ch of str) {
    bytes += /[\x00-\x7F]/.test(ch) ? 1 : 2;
  }
  return bytes;
}

export default function SmsSendDialog({
  open,
  onClose,
  defaultRecipient = '',
  defaultVariables = {},
  defaultBody,
}: Props) {
  const queryClient = useQueryClient();
  const [recipient, setRecipient] = useState('');
  const [templateId, setTemplateId] = useState<string>('');
  const [manualBody, setManualBody] = useState('');
  const [vars, setVars] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('');

  const { data: templates = [] } = useQuery<MessageTemplate[]>({
    queryKey: ['message-templates'],
    queryFn: async () => {
      const res = await fetch('/api/message-templates');
      const json = await res.json();
      return json.data || [];
    },
    enabled: open,
  });

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const templateBody = selectedTemplate?.body ?? '';
  const templateVars = useMemo(
    () => extractVariables(templateBody),
    [templateBody],
  );

  useEffect(() => {
    if (open) {
      setRecipient(defaultRecipient.replace(/-/g, ''));
      setTemplateId('');
      setManualBody(defaultBody || '');
      setTitle('');
      setVars(defaultVariables);
    }
  }, [open, defaultRecipient, defaultVariables]);

  useEffect(() => {
    if (!selectedTemplate) return;
    const initial: Record<string, string> = {};
    templateVars.forEach((v) => {
      initial[v] = defaultVariables[v] || '';
    });
    setVars(initial);
  }, [selectedTemplate, templateVars, defaultVariables]);

  const finalBody = useMemo(() => {
    const source = selectedTemplate ? templateBody : manualBody;
    return source.replace(
      /\{\{(.+?)\}\}/g,
      (_, k) => vars[k.trim()] || `{{${k}}}`,
    );
  }, [selectedTemplate, templateBody, manualBody, vars]);

  const bytes = getByteLength(finalBody);
  const msgType: 'SMS' | 'LMS' = bytes <= 90 ? 'SMS' : 'LMS';
  const overLimit = bytes > 2000;

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient,
          msg: finalBody,
          title: msgType === 'LMS' ? title || undefined : undefined,
          templateId: templateId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '발송 실패');
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-logs'] });
      queryClient.invalidateQueries({ queryKey: ['sms-quota'] });
      toast.success('문자가 발송되었습니다');
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!open) return null;

  const cleanedRecipient = recipient.replace(/-/g, '');
  const phoneValid = /^\d{9,11}$/.test(cleanedRecipient);
  const canSend =
    phoneValid &&
    finalBody.trim().length > 0 &&
    !overLimit &&
    !sendMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">문자 발송</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              수신자 전화번호 *
            </label>
            <input
              type="tel"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="01012345678"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {recipient && !phoneValid && (
              <p className="mt-1 text-xs text-red-500">
                숫자만 9~11자리로 입력하세요
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">템플릿</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— 직접 입력 —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {!selectedTemplate && (
            <div>
              <label className="mb-1 block text-sm font-medium">본문</label>
              <textarea
                value={manualBody}
                onChange={(e) => setManualBody(e.target.value)}
                rows={6}
                placeholder="발송할 문자 내용을 입력하세요"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {selectedTemplate && templateVars.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                변수 입력
              </label>
              <div className="space-y-2">
                {templateVars.map((v) => (
                  <div key={v} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 rounded bg-primary/10 px-2 py-1 text-center text-xs font-medium text-primary">
                      {v}
                    </span>
                    <input
                      type="text"
                      value={vars[v] || ''}
                      onChange={(e) =>
                        setVars((prev) => ({ ...prev, [v]: e.target.value }))
                      }
                      placeholder={`${v} 값 입력`}
                      className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {msgType === 'LMS' && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                제목{' '}
                <span className="text-xs text-muted-foreground">
                  (LMS 선택)
                </span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="장문 제목"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium">미리보기</label>
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${
                    msgType === 'SMS'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                  }`}
                >
                  {msgType}
                </span>
                <span
                  className={`font-mono ${
                    overLimit ? 'text-red-500' : 'text-muted-foreground'
                  }`}
                >
                  {bytes}바이트{msgType === 'SMS' ? ' / 90' : ' / 2000'}
                </span>
              </div>
            </div>
            <pre className="min-h-[80px] whitespace-pre-wrap rounded-lg border border-border bg-muted/50 p-3 text-sm leading-relaxed">
              {finalBody || (
                <span className="text-muted-foreground">(내용 없음)</span>
              )}
            </pre>
            {overLimit && (
              <p className="mt-1 text-xs text-red-500">
                2000바이트를 초과했습니다
              </p>
            )}
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
            {process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')
              ? '💡 테스트 모드 여부는 서버의 ALIGO_TEST_MODE 환경변수에 따릅니다'
              : '실제 발송 시 과금이 발생합니다'}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              취소
            </button>
            <button
              onClick={() => sendMutation.mutate()}
              disabled={!canSend}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sendMutation.isPending ? '발송 중...' : '발송'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
