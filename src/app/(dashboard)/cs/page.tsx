'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Toaster, toast } from 'sonner';
import { Plus, Search, Headphones, X } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';

type CSRecord = {
  id: string;
  consultDate: string;
  purchaseDate: string | null;
  status: string;
  receivedDate: string | null;
  customerName: string;
  productName: string;
  consultNote: string | null;
  receivedProduct: string | null;
  serviceProgress: string | null;
  shippingDate: string | null;
  customerAddress: string | null;
  customerPhone: string;
  chargeType: string;
  repairCost: number | null;
  trackingNumber: string | null;
};

const STATUS_LIST = ['교환요청', '진행 중', '미입고', '연락처없음', '안내완료', '완료'] as const;

const STATUS_COLORS: Record<string, string> = {
  '교환요청': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  '미입고': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  '연락처없음': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  '진행 중': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  '안내완료': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  '완료': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
};

const EMPTY_FORM = {
  consultDate: new Date().toISOString().split('T')[0],
  purchaseDate: '',
  status: '교환요청',
  receivedDate: '',
  customerName: '',
  productName: '',
  consultNote: '',
  receivedProduct: '',
  serviceProgress: '',
  shippingDate: '',
  customerAddress: '',
  customerPhone: '',
  chargeType: '유상',
  repairCost: '',
  trackingNumber: '',
};

function toDateInput(value: string | null): string {
  if (!value) return '';
  return new Date(value).toISOString().split('T')[0];
}

export default function CSPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const isOwner = session?.user?.role === 'OWNER';

  // 필터
  const now = new Date();
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // 다이얼로그
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // 상태별 카운트
  const { data: stats = {} } = useQuery<Record<string, number>>({
    queryKey: ['csStats'],
    queryFn: async () => {
      const res = await fetch('/api/cs/stats');
      const json = await res.json();
      return json.data;
    },
  });

  // CS 목록
  const { data: records = [], isLoading } = useQuery<CSRecord[]>({
    queryKey: ['cs', filterStatus, filterMonth, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterMonth) params.set('month', filterMonth);
      if (search) params.set('search', search);
      const res = await fetch(`/api/cs?${params}`);
      const json = await res.json();
      return json.data;
    },
  });

  // 등록/수정 mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: { id?: string; data: Record<string, unknown> }) => {
      const url = payload.id ? `/api/cs/${payload.id}` : '/api/cs';
      const method = payload.id ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || '저장 실패');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(editingId ? '수정되었습니다' : '등록되었습니다');
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ['cs'] });
      queryClient.invalidateQueries({ queryKey: ['csStats'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // 삭제 mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/cs/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || '삭제 실패');
      }
    },
    onSuccess: () => {
      toast.success('삭제되었습니다');
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ['cs'] });
      queryClient.invalidateQueries({ queryKey: ['csStats'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (record: CSRecord) => {
    setEditingId(record.id);
    setForm({
      consultDate: toDateInput(record.consultDate),
      purchaseDate: toDateInput(record.purchaseDate),
      status: record.status,
      receivedDate: toDateInput(record.receivedDate),
      customerName: record.customerName,
      productName: record.productName,
      consultNote: record.consultNote || '',
      receivedProduct: record.receivedProduct || '',
      serviceProgress: record.serviceProgress || '',
      shippingDate: toDateInput(record.shippingDate),
      customerAddress: record.customerAddress || '',
      customerPhone: record.customerPhone,
      chargeType: record.chargeType,
      repairCost: record.repairCost?.toString() || '',
      trackingNumber: record.trackingNumber || '',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.consultDate || !form.customerName || !form.customerPhone || !form.productName) {
      toast.error('상담날짜, 고객명, 전화번호, 제품명은 필수입니다');
      return;
    }
    saveMutation.mutate({
      id: editingId || undefined,
      data: {
        ...form,
        repairCost: form.repairCost || null,
        consultNote: form.consultNote || null,
        receivedProduct: form.receivedProduct || null,
        serviceProgress: form.serviceProgress || null,
        customerAddress: form.customerAddress || null,
        trackingNumber: form.trackingNumber || null,
        purchaseDate: form.purchaseDate || null,
        receivedDate: form.receivedDate || null,
        shippingDate: form.shippingDate || null,
      },
    });
  };

  const handleDelete = () => {
    if (!editingId) return;
    if (!confirm('이 CS 데이터를 삭제하시겠습니까?')) return;
    deleteMutation.mutate(editingId);
  };

  const handleSearch = () => {
    setSearch(searchInput);
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // 월별 옵션 생성 (최근 12개월)
  const monthOptions: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    );
  }

  const saving = saveMutation.isPending;

  return (
    <div className="space-y-6">
      <ProgressBar loading={isLoading} />
      <Toaster richColors position="top-right" />

      {/* 헤더 */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Headphones className="h-6 w-6" />
          CS 관리
        </h1>
        <p className="text-sm text-muted-foreground">
          A/S 접수 및 처리 현황을 관리합니다
        </p>
      </div>

      {/* 상태 필터 배지 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus('')}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            filterStatus === ''
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          전체 {stats['전체'] !== undefined && `(${stats['전체']})`}
        </button>
        {STATUS_LIST.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              filterStatus === s
                ? 'bg-primary text-primary-foreground'
                : `${STATUS_COLORS[s]} hover:opacity-80`
            }`}
          >
            {s} {stats[s] !== undefined && `(${stats[s]})`}
          </button>
        ))}
      </div>

      {/* 월별 필터 + 검색 */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">전체 기간</option>
          {monthOptions.map((m) => (
            <option key={m} value={m}>
              {m.replace('-', '년 ')}월
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (e.target.value === '') setSearch('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="고객명 / 전화번호 검색"
            className="w-48 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleSearch}
            className="rounded-lg border border-input bg-background p-2 hover:bg-muted"
          >
            <Search className="h-4 w-4" />
          </button>
          {search && (
            <button
              onClick={() => {
                setSearchInput('');
                setSearch('');
              }}
              className="rounded-lg border border-input bg-background p-2 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          새 CS 등록
        </button>
      </div>

      {/* 테이블 */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1400px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium">상담날짜</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium">구입일자</th>
                <th className="whitespace-nowrap px-4 py-3 text-center font-medium">안내상태</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium">입고날짜</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium">고객명</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium">제품명</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium">상담내용</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium">입고제품</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium">A/S 진행상황</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium">출고날짜</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium">고객주소</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium">전화번호</th>
                <th className="whitespace-nowrap px-4 py-3 text-center font-medium">유상/무료</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-medium">수리비용</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium">배송번호</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {Array.from({ length: 15 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td
                    colSpan={15}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    등록된 CS 데이터가 없습니다
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => openEdit(r)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                      {new Date(r.consultDate).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                      {r.purchaseDate ? new Date(r.purchaseDate).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] || 'bg-muted text-muted-foreground'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                      {r.receivedDate ? new Date(r.receivedDate).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">{r.customerName}</td>
                    <td className="max-w-[160px] truncate px-4 py-3">{r.productName}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground">{r.consultNote || '-'}</td>
                    <td className="max-w-[160px] truncate px-4 py-3">{r.receivedProduct || '-'}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground">{r.serviceProgress || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                      {r.shippingDate ? new Date(r.shippingDate).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground">{r.customerAddress || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{r.customerPhone}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <span className={`text-xs font-medium ${r.chargeType === '유상' ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {r.chargeType}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                      {r.repairCost ? `${r.repairCost.toLocaleString()}원` : '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{r.trackingNumber || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 등록/수정 다이얼로그 */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`max-h-[90vh] w-full overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl ${editingId ? 'max-w-2xl' : 'max-w-md'}`}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingId ? 'CS 상세 / 수정' : '새 CS 등록'}
              </h2>
              <button onClick={closeDialog} className="rounded p-1 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            {editingId ? (
              /* 수정 모드: 전체 필드 2컬럼 */
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">고객 정보</h3>
                  <Field label="고객명 *">
                    <input type="text" value={form.customerName} onChange={(e) => updateField('customerName', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </Field>
                  <Field label="전화번호 *">
                    <input type="text" value={form.customerPhone} onChange={(e) => updateField('customerPhone', e.target.value)} placeholder="010-0000-0000" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </Field>
                  <Field label="고객 주소">
                    <input type="text" value={form.customerAddress} onChange={(e) => updateField('customerAddress', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </Field>
                  <Field label="상담날짜 *">
                    <input type="date" value={form.consultDate} onChange={(e) => updateField('consultDate', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </Field>
                  <Field label="제품구입일자">
                    <input type="date" value={form.purchaseDate} onChange={(e) => updateField('purchaseDate', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </Field>
                  <Field label="제품명 *">
                    <input type="text" value={form.productName} onChange={(e) => updateField('productName', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </Field>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">A/S 정보</h3>
                  <Field label="안내상태">
                    <select value={form.status} onChange={(e) => updateField('status', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      {STATUS_LIST.map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>
                  </Field>
                  <Field label="A/S 내용 및 상담내용">
                    <textarea value={form.consultNote} onChange={(e) => updateField('consultNote', e.target.value)} rows={2} className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </Field>
                  <Field label="입고된 제품">
                    <input type="text" value={form.receivedProduct} onChange={(e) => updateField('receivedProduct', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </Field>
                  <Field label="A/S 진행상황">
                    <textarea value={form.serviceProgress} onChange={(e) => updateField('serviceProgress', e.target.value)} rows={2} className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </Field>
                  <Field label="제품입고날짜">
                    <input type="date" value={form.receivedDate} onChange={(e) => updateField('receivedDate', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </Field>
                  <Field label="출고날짜">
                    <input type="date" value={form.shippingDate} onChange={(e) => updateField('shippingDate', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="유상/무료">
                      <select value={form.chargeType} onChange={(e) => updateField('chargeType', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="유상">유상</option>
                        <option value="무료">무료</option>
                      </select>
                    </Field>
                    <Field label="수리비용 (원)">
                      <input type="number" value={form.repairCost} onChange={(e) => updateField('repairCost', e.target.value)} placeholder="0" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </Field>
                  </div>
                  <Field label="배송번호">
                    <input type="text" value={form.trackingNumber} onChange={(e) => updateField('trackingNumber', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </Field>
                </div>
              </div>
            ) : (
              /* 등록 모드: 간단한 폼 */
              <div className="space-y-4">
                <Field label="고객명 *">
                  <input type="text" value={form.customerName} onChange={(e) => updateField('customerName', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </Field>
                <Field label="전화번호 *">
                  <input type="text" value={form.customerPhone} onChange={(e) => updateField('customerPhone', e.target.value)} placeholder="010-0000-0000" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </Field>
                <Field label="고객 주소">
                  <input type="text" value={form.customerAddress} onChange={(e) => updateField('customerAddress', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </Field>
                <Field label="상담날짜 *">
                  <input type="date" value={form.consultDate} onChange={(e) => updateField('consultDate', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </Field>
                <Field label="제품명 *">
                  <input type="text" value={form.productName} onChange={(e) => updateField('productName', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </Field>
                <Field label="A/S 내용 및 상담내용">
                  <textarea value={form.consultNote} onChange={(e) => updateField('consultNote', e.target.value)} rows={3} className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </Field>
              </div>
            )}

            {/* 버튼 */}
            <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
              <div>
                {editingId && isOwner && (
                  <button
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    {deleteMutation.isPending ? '삭제 중...' : '삭제'}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={closeDialog}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
