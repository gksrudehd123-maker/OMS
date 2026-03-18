'use client';

import { useTheme } from 'next-themes';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sun,
  Moon,
  Monitor,
  Save,
  Loader2,
  Check,
  Store,
  ExternalLink,
  Upload,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';

const themes = [
  {
    value: 'light',
    label: '라이트 모드',
    description: '밝은 배경에 어두운 텍스트',
    icon: Sun,
  },
  {
    value: 'dark',
    label: '다크 모드',
    description: '어두운 배경에 밝은 텍스트',
    icon: Moon,
  },
  {
    value: 'system',
    label: '시스템 설정',
    description: '운영체제 설정에 따라 자동 전환',
    icon: Monitor,
  },
];

type Channel = {
  id: string;
  name: string;
  code: string;
  feeRate: string;
  isActive: boolean;
  _count: { orders: number };
};

type UploadRecord = {
  id: string;
  fileName: string;
  channel: { name: string };
  totalRows: number;
  successRows: number;
  errorRows: number;
  createdAt: string;
};

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // 채널 관리 state
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);

  // 데이터 관리 state
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 기본값 설정 state
  const [defaultShippingCost, setDefaultShippingCost] = useState('');
  const [defaultFreeShippingMin, setDefaultFreeShippingMin] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingDefaults, setLoadingDefaults] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.defaultShippingCost) setDefaultShippingCost(data.defaultShippingCost);
        if (data.defaultFreeShippingMin) setDefaultFreeShippingMin(data.defaultFreeShippingMin);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDefaults(false);
    }
  }, []);

  const loadChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/channels');
      if (res.ok) setChannels(await res.json());
    } catch {
      // ignore
    } finally {
      setLoadingChannels(false);
    }
  }, []);

  const loadUploads = useCallback(async () => {
    try {
      const res = await fetch('/api/upload?limit=50');
      if (res.ok) {
        const data = await res.json();
        setUploads(data.uploads || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingUploads(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadSettings();
    loadChannels();
    loadUploads();
  }, [loadSettings, loadChannels, loadUploads]);

  const handleSaveDefaults = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultShippingCost: defaultShippingCost || '0',
          defaultFreeShippingMin: defaultFreeShippingMin || '',
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      alert('설정 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUpload = async (uploadId: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/upload/${uploadId}`, { method: 'DELETE' });
      if (res.ok) {
        setUploads((prev) => prev.filter((u) => u.id !== uploadId));
        setShowDeleteConfirm(null);
      } else {
        alert('삭제에 실패했습니다');
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">설정</h1>
        <p className="text-sm text-muted-foreground">
          시스템 설정을 관리합니다
        </p>
      </div>

      {/* 테마 설정 */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">테마 설정</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          화면 테마를 선택하세요
        </p>

        {mounted && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {themes.map((t) => {
              const isActive = theme === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={`flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all ${
                    isActive
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
                  }`}
                >
                  <div
                    className={`rounded-full p-3 ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <t.icon className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <p
                      className={`text-sm font-medium ${isActive ? 'text-primary' : ''}`}
                    >
                      {t.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t.description}
                    </p>
                  </div>
                  {isActive && (
                    <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                      사용 중
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 기본값 설정 */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">기본값 설정</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          신규 상품이 업로드로 자동 등록될 때 적용되는 기본값
        </p>

        {loadingDefaults ? (
          <div className="mt-4 flex h-24 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            불러오는 중...
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">
                  기본 배송비 (원)
                </label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  신규 상품의 기본 배송비
                </p>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={defaultShippingCost}
                  onChange={(e) => setDefaultShippingCost(e.target.value)}
                  placeholder="예: 3000"
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  무료배송 기준금액 (원)
                </label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  이 금액 이상 주문 시 배송비 무료 (비워두면 미적용)
                </p>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={defaultFreeShippingMin}
                  onChange={(e) => setDefaultFreeShippingMin(e.target.value)}
                  placeholder="예: 50000"
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveDefaults}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? '저장 중...' : saved ? '저장 완료!' : '저장'}
              </button>
              {saved && (
                <span className="text-sm text-green-600">
                  설정이 저장되었습니다
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 채널 관리 바로가기 */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">채널 관리</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              판매 채널 및 수수료율 관리
            </p>
          </div>
          <button
            onClick={() => router.push('/channels')}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Store className="h-4 w-4" />
            채널 관리 페이지
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        {loadingChannels ? (
          <div className="mt-4 flex h-16 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            불러오는 중...
          </div>
        ) : channels.length === 0 ? (
          <div className="mt-4 rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
            등록된 채널이 없습니다
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {channels.map((ch) => (
              <div
                key={ch.id}
                onClick={() => router.push('/channels')}
                className="cursor-pointer rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{ch.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      ch.isActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {ch.isActive ? '활성' : '비활성'}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>코드: {ch.code}</span>
                  <span>수수료: {ch.feeRate}%</span>
                  <span>주문: {ch._count.orders}건</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 데이터 관리 */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">데이터 관리</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          업로드 이력 조회 및 데이터 삭제
        </p>

        {loadingUploads ? (
          <div className="mt-4 flex h-24 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            불러오는 중...
          </div>
        ) : uploads.length === 0 ? (
          <div className="mt-4 rounded-lg bg-muted/50 p-6 text-center text-sm text-muted-foreground">
            <Upload className="mx-auto mb-2 h-6 w-6" />
            업로드 이력이 없습니다
          </div>
        ) : (
          <div className="mt-4">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">파일명</th>
                    <th className="px-4 py-3 text-left font-medium">채널</th>
                    <th className="px-4 py-3 text-center font-medium">성공</th>
                    <th className="px-4 py-3 text-center font-medium">오류</th>
                    <th className="px-4 py-3 text-left font-medium">업로드 일시</th>
                    <th className="px-4 py-3 text-center font-medium">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-green-600" />
                          <span className="max-w-[200px] truncate">{u.fileName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {u.channel.name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-green-600">{u.successRows}</span>
                        <span className="text-muted-foreground">/{u.totalRows}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.errorRows > 0 ? (
                          <span className="text-red-500">{u.errorRows}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(u.createdAt).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {showDeleteConfirm === u.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleDeleteUpload(u.id)}
                              disabled={deleting}
                              className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                            >
                              {deleting ? '삭제중...' : '확인'}
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(null)}
                              className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowDeleteConfirm(u.id)}
                            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                            title="이 업로드 및 관련 주문 삭제"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>업로드를 삭제하면 해당 업로드로 추가된 주문 데이터도 함께 삭제됩니다. 상품 정보는 유지됩니다.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
