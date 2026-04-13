'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Send } from 'lucide-react';

type MessageTemplate = {
  id: string;
  title: string;
  body: string;
  channel: string;
};

type CSRecord = {
  id: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  status: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
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

function buildPerRecipientBody(
  template: string,
  record: CSRecord,
  sharedVars: Record<string, string>,
): string {
  return template.replace(/\{\{(.+?)\}\}/g, (_, rawKey) => {
    const key = rawKey.trim();
    if (key === '고객명') return record.customerName || '';
    if (key === '제품명') return record.productName || '';
    return sharedVars[key] || `{{${key}}}`;
  });
}

export default function BulkSmsSendDialog({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [templateId, setTemplateId] = useState('');
  const [manualBody, setManualBody] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sharedVars, setSharedVars] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  const { data: records = [] } = useQuery<CSRecord[]>({
    queryKey: ['cs-records-for-bulk-sms'],
    queryFn: async () => {
      const res = await fetch('/api/cs');
      const json = await res.json();
      return (json.data || []).filter((r: CSRecord) => r.customerPhone);
    },
    enabled: open,
  });

  const { data: templates = [] } = useQuery<MessageTemplate[]>({
    queryKey: ['message-templates'],
    queryFn: async () => {
      const res = await fetch('/api/message-templates');
      const json = await res.json();
      return json.data || [];
    },
    enabled: open,
  });

  const smsLmsTemplates = templates.filter(
    (t) => t.channel === 'SMS' || t.channel === 'LMS',
  );

  const selectedTemplate = smsLmsTemplates.find((t) => t.id === templateId);
  const bodySource = selectedTemplate?.body ?? manualBody;
  const allVars = useMemo(() => extractVariables(bodySource), [bodySource]);
  const sharedVarKeys = allVars.filter((k) => k !== '고객명' && k !== '제품명');

  useEffect(() => {
    if (open) {
      setTemplateId('');
      setManualBody('');
      setSelectedIds(new Set());
      setSharedVars({});
      setTitle('');
      setProgress(null);
    }
  }, [open]);

  const toggleAll = () => {
    if (selectedIds.size === records.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(records.map((r) => r.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const previewRecord = records.find((r) => selectedIds.has(r.id));
  const previewBody = previewRecord
    ? buildPerRecipientBody(bodySource, previewRecord, sharedVars)
    : '';
  const previewBytes = getByteLength(previewBody);
  const previewMsgType: 'SMS' | 'LMS' = previewBytes <= 90 ? 'SMS' : 'LMS';

  const handleSend = async () => {
    const targets = records.filter((r) => selectedIds.has(r.id));
    if (targets.length === 0) {
      toast.error('수신자를 선택하세요');
      return;
    }
    if (!bodySource.trim()) {
      toast.error('본문을 입력하거나 템플릿을 선택하세요');
      return;
    }
    if (
      !confirm(
        `${targets.length}명에게 문자를 발송합니다. 과금이 발생할 수 있습니다. 계속할까요?`,
      )
    ) {
      return;
    }

    setSending(true);
    setProgress({ done: 0, total: targets.length });
    let success = 0;
    let fail = 0;
    for (const r of targets) {
      const msg = buildPerRecipientBody(bodySource, r, sharedVars);
      try {
        const res = await fetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: r.customerPhone,
            msg,
            title: getByteLength(msg) > 90 ? title || undefined : undefined,
            templateId: templateId || undefined,
          }),
        });
        const json = await res.json();
        if (res.ok && json.success) success += 1;
        else fail += 1;
      } catch {
        fail += 1;
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : null));
    }
    setSending(false);
    queryClient.invalidateQueries({ queryKey: ['sms-logs'] });
    queryClient.invalidateQueries({ queryKey: ['sms-quota'] });
    toast[fail === 0 ? 'success' : 'error'](
      `발송 완료: 성공 ${success}건 / 실패 ${fail}건`,
    );
    if (fail === 0) onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-6 pb-4">
          <h2 className="text-lg font-semibold">일괄 문자 발송</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 gap-4 overflow-hidden p-6">
          {/* 좌: 수신자 선택 */}
          <div className="flex w-1/2 flex-col">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">
                수신자 ({selectedIds.size}/{records.length})
              </label>
              <button
                onClick={toggleAll}
                className="text-xs text-primary hover:underline"
              >
                {selectedIds.size === records.length
                  ? '전체 해제'
                  : '전체 선택'}
              </button>
            </div>
            <div className="flex-1 overflow-auto rounded-lg border border-border">
              {records.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  전화번호가 있는 CS 레코드가 없습니다
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {records.map((r) => (
                    <li
                      key={r.id}
                      onClick={() => toggleOne(r.id)}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        readOnly
                        className="h-4 w-4"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {r.customerName}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {r.productName}
                          </span>
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {r.customerPhone}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px]">
                        {r.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 우: 본문 설정 */}
          <div className="flex w-1/2 flex-col gap-3 overflow-auto">
            <div>
              <label className="mb-1 block text-sm font-medium">템플릿</label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— 직접 입력 —</option>
                {smsLmsTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.channel})
                  </option>
                ))}
              </select>
            </div>

            {!selectedTemplate && (
              <div>
                <label className="mb-1 block text-sm font-medium">
                  본문{' '}
                  <span className="text-xs text-muted-foreground">
                    (고객명, 제품명은 자동 치환)
                  </span>
                </label>
                <textarea
                  value={manualBody}
                  onChange={(e) => setManualBody(e.target.value)}
                  rows={6}
                  placeholder="안녕하세요 {{고객명}}님, {{제품명}} 관련 안내드립니다"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}

            {sharedVarKeys.length > 0 && (
              <div>
                <label className="mb-1 block text-sm font-medium">
                  공용 변수
                </label>
                <div className="space-y-2">
                  {sharedVarKeys.map((v) => (
                    <div key={v} className="flex items-center gap-2">
                      <span className="w-20 shrink-0 rounded bg-primary/10 px-2 py-1 text-center text-xs font-medium text-primary">
                        {v}
                      </span>
                      <input
                        type="text"
                        value={sharedVars[v] || ''}
                        onChange={(e) =>
                          setSharedVars((s) => ({ ...s, [v]: e.target.value }))
                        }
                        placeholder={`${v} 값`}
                        className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewMsgType === 'LMS' && (
              <div>
                <label className="mb-1 block text-sm font-medium">
                  LMS 제목{' '}
                  <span className="text-xs text-muted-foreground">(선택)</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-medium">
                  미리보기 {previewRecord && `(${previewRecord.customerName})`}
                </label>
                <span className="text-xs font-mono text-muted-foreground">
                  {previewBytes}바이트 · {previewMsgType}
                </span>
              </div>
              <pre className="min-h-[60px] max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/50 p-2 text-xs leading-relaxed">
                {previewBody || (
                  <span className="text-muted-foreground">
                    수신자를 선택하고 본문을 입력하세요
                  </span>
                )}
              </pre>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border p-4">
          <div className="text-xs text-muted-foreground">
            {progress
              ? `발송 중 ${progress.done}/${progress.total}`
              : `${selectedIds.size}명 선택됨`}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={sending}
              className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleSend}
              disabled={sending || selectedIds.size === 0 || !bodySource.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sending ? '발송 중...' : `${selectedIds.size}명에게 발송`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
