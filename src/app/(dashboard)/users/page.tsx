'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Users, Plus, Trash2 } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Toaster, toast } from 'sonner';

type Channel = {
  id: string;
  name: string;
  isActive: boolean;
};

type User = {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  allowedChannels: string[];
  createdAt: string;
};

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  OWNER: {
    label: '소유자',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  },
  MANAGER: {
    label: '관리자',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  STAFF: {
    label: '스태프',
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  },
};

export default function UsersPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [editUser, setEditUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<string>('');
  const [editChannels, setEditChannels] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);

  // 사용자 추가 state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('조회 실패');
      return res.json();
    },
  });

  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ['channels'],
    queryFn: async () => {
      const res = await fetch('/api/channels');
      return res.json();
    },
  });

  const activeChannels = channels.filter((ch) => ch.isActive);

  const createMutation = useMutation({
    mutationFn: async (body: { email: string; password: string; name: string }) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '등록 실패');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('사용자가 등록되었습니다');
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setShowAddForm(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleCreate = () => {
    if (!newName || !newEmail || !newPassword) {
      toast.error('이름, 이메일, 비밀번호를 모두 입력해주세요');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('비밀번호는 6자 이상이어야 합니다');
      return;
    }
    createMutation.mutate({ name: newName, email: newEmail, password: newPassword });
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '수정 실패');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '삭제 실패');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('사용자가 삭제되었습니다');
      setDeleteConfirm(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const saving = updateMutation.isPending;

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditName(u.name);
    setEditRole(u.role);
    setEditChannels(u.allowedChannels);
  };

  const handleSave = () => {
    if (!editUser) return;
    const body: Record<string, unknown> = {
      name: editName,
      allowedChannels: editChannels,
    };
    // 자기 자신의 역할은 변경하지 않음
    if (editUser.id !== session?.user?.id) {
      body.role = editRole;
    }
    updateMutation.mutate(
      { id: editUser.id, body },
      {
        onSuccess: () => {
          toast.success('사용자 정보가 수정되었습니다');
          setEditUser(null);
        },
      },
    );
  };

  const toggleChannel = (channelId: string) => {
    setEditChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId],
    );
  };

  const getChannelNames = (channelIds: string[]) => {
    if (channelIds.length === 0) return '전체';
    return channelIds
      .map((id) => channels.find((ch) => ch.id === id)?.name)
      .filter(Boolean)
      .join(', ') || '전체';
  };

  const isMe = (userId: string) => session?.user?.id === userId;

  return (
    <div className="space-y-6">
      <ProgressBar loading={isLoading} />
      <Toaster richColors position="top-right" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">사용자 관리</h1>
          <p className="text-sm text-muted-foreground">
            사용자 역할과 채널 접근 권한을 관리합니다. 행을 클릭하여 수정하세요.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 self-start rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          사용자 추가
        </button>
      </div>

      {showAddForm && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 text-lg font-semibold">새 사용자 등록</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">이름</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="홍길동"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">이메일</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">비밀번호</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="6자 이상"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            새 사용자는 STAFF 역할로 등록됩니다. 등록 후 역할과 채널 권한을 변경할 수 있습니다.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {createMutation.isPending ? '등록 중...' : '등록'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 사용자 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="whitespace-nowrap px-4 py-3 text-left font-medium">이름</th>
              <th className="whitespace-nowrap px-4 py-3 text-left font-medium">이메일</th>
              <th className="whitespace-nowrap px-4 py-3 text-left font-medium">역할</th>
              <th className="whitespace-nowrap px-4 py-3 text-left font-medium">접근 채널</th>
              <th className="whitespace-nowrap px-4 py-3 text-left font-medium">가입일</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    등록된 사용자가 없습니다.
                  </p>
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => openEdit(u)}
                  className="cursor-pointer border-b border-border transition-colors hover:bg-muted/50"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-medium">
                    {u.name}
                    {isMe(u.id) && (
                      <span className="ml-1.5 text-xs text-muted-foreground">(나)</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {u.email}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_LABELS[u.role]?.color}`}
                    >
                      {ROLE_LABELS[u.role]?.label || u.role}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {u.role === 'OWNER' ? '전체' : getChannelNames(u.allowedChannels)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 사용자 편집 다이얼로그 */}
      <Dialog
        open={!!editUser}
        onOpenChange={(open) => !open && setEditUser(null)}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>사용자 정보 수정</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">이메일</p>
                <p className="text-sm font-medium">{editUser.email}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">이름</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">역할</label>
                {isMe(editUser.id) ? (
                  <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_LABELS[editUser.role]?.color}`}>
                      {ROLE_LABELS[editUser.role]?.label}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      자신의 역할은 변경할 수 없습니다
                    </span>
                  </div>
                ) : (
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="STAFF">스태프</option>
                    <option value="MANAGER">관리자</option>
                    <option value="OWNER">소유자</option>
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">접근 가능 채널</label>
                <p className="text-xs text-muted-foreground">
                  선택하지 않으면 모든 채널에 접근할 수 있습니다.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {activeChannels.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => toggleChannel(ch.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        editChannels.includes(ch.id)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {ch.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {!isMe(editUser.id) ? (
                  <button
                    onClick={() => {
                      setEditUser(null);
                      setDeleteConfirm(editUser);
                    }}
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    삭제
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditUser(null)}
                    className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>사용자 삭제</DialogTitle>
          </DialogHeader>
          {deleteConfirm && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{deleteConfirm.name}</span>
                ({deleteConfirm.email}) 사용자를 삭제하시겠습니까?
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted"
                >
                  취소
                </button>
                <button
                  onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                  disabled={deleteMutation.isPending}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? '삭제 중...' : '삭제'}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
