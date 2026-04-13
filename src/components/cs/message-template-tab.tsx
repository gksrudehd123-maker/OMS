'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Eye, X, MessageSquare } from 'lucide-react';

type MessageTemplate = {
  id: string;
  title: string;
  body: string;
  channel: string;
  createdAt: string;
  updatedAt: string;
};

const CHANNEL_LABELS: Record<string, string> = {
  SMS: 'SMS',
  LMS: 'LMS',
  KAKAO: '카카오 알림톡',
};

const CHANNEL_COLORS: Record<string, string> = {
  SMS: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  LMS: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  KAKAO:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(.+?)\}\}/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, ''))));
}

export default function MessageTemplateTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState('SMS');
  const [previewOpen, setPreviewOpen] = useState<string | null>(null);
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery<MessageTemplate[]>({
    queryKey: ['message-templates'],
    queryFn: async () => {
      const res = await fetch('/api/message-templates');
      const json = await res.json();
      return json.data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editingId
        ? `/api/message-templates/${editingId}`
        : '/api/message-templates';
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, channel }),
      });
      if (!res.ok) throw new Error('저장 실패');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast.success(
        editingId ? '템플릿이 수정되었습니다' : '템플릿이 생성되었습니다',
      );
      closeDialog();
    },
    onError: () => toast.error('저장 중 오류가 발생했습니다'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/message-templates/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('삭제 실패');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast.success('템플릿이 삭제되었습니다');
      setDeleteConfirm(null);
    },
    onError: () => toast.error('삭제 중 오류가 발생했습니다'),
  });

  function openCreate() {
    setEditingId(null);
    setTitle('');
    setBody('');
    setChannel('SMS');
    setDialogOpen(true);
  }

  function openEdit(tpl: MessageTemplate) {
    setEditingId(tpl.id);
    setTitle(tpl.title);
    setBody(tpl.body);
    setChannel(tpl.channel || 'SMS');
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setTitle('');
    setBody('');
    setChannel('SMS');
  }

  function openPreview(tpl: MessageTemplate) {
    const vars = extractVariables(tpl.body);
    const initial: Record<string, string> = {};
    vars.forEach((v) => (initial[v] = ''));
    setPreviewVars(initial);
    setPreviewOpen(tpl.id);
  }

  function getPreviewText(text: string) {
    return text.replace(/\{\{(.+?)\}\}/g, (_, key) => {
      return previewVars[key] || `{{${key}}}`;
    });
  }

  const dialogVariables = extractVariables(body);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-xl border border-border bg-muted/50"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          문자 발송 시 사용할 메시지 템플릿을 관리합니다.{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            {'{{변수명}}'}
          </code>
          으로 변수를 삽입할 수 있습니다.
        </p>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />새 템플릿
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-muted-foreground">
          <MessageSquare className="mb-3 h-10 w-10" />
          <p className="text-sm">등록된 템플릿이 없습니다</p>
          <button
            onClick={openCreate}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            첫 템플릿 만들기
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => {
            const vars = extractVariables(tpl.body);
            const isPreviewing = previewOpen === tpl.id;

            return (
              <div
                key={tpl.id}
                className="flex flex-col rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between border-b border-border p-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{tpl.title}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${CHANNEL_COLORS[tpl.channel] || CHANNEL_COLORS.SMS}`}
                    >
                      {CHANNEL_LABELS[tpl.channel] || tpl.channel}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        isPreviewing ? setPreviewOpen(null) : openPreview(tpl)
                      }
                      className={`rounded-md p-1.5 transition-colors ${
                        isPreviewing
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                      title="미리보기"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openEdit(tpl)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title="수정"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(tpl.id)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                      title="삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-4">
                  {isPreviewing ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {vars.map((v) => (
                          <input
                            key={v}
                            type="text"
                            placeholder={v}
                            value={previewVars[v] || ''}
                            onChange={(e) =>
                              setPreviewVars((prev) => ({
                                ...prev,
                                [v]: e.target.value,
                              }))
                            }
                            className="w-28 rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        ))}
                      </div>
                      <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                        {getPreviewText(tpl.body)}
                      </pre>
                    </div>
                  ) : (
                    <pre className="line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {tpl.body}
                    </pre>
                  )}
                </div>

                {vars.length > 0 && (
                  <div className="border-t border-border px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {vars.map((v) => (
                        <span
                          key={v}
                          className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 생성/수정 다이얼로그 */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingId ? '템플릿 수정' : '새 템플릿 만들기'}
              </h2>
              <button
                onClick={closeDialog}
                className="rounded-md p-1 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">제목</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="예: A/S 안내"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">채널</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="SMS">SMS</option>
                    <option value="LMS">LMS</option>
                    <option value="KAKAO">카카오 알림톡</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  본문{' '}
                  <span className="font-normal text-muted-foreground">
                    {'({{변수명}}으로 변수 삽입)'}
                  </span>
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  placeholder={
                    '안녕하세요 {{고객명}} 님\n\n내용을 입력하세요...'
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {dialogVariables.length > 0 && (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    감지된 변수
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {dialogVariables.map((v) => (
                      <span
                        key={v}
                        className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={closeDialog}
                  className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  취소
                </button>
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={
                    !title.trim() || !body.trim() || saveMutation.isPending
                  }
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saveMutation.isPending ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold">템플릿 삭제</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              이 템플릿을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                취소
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
