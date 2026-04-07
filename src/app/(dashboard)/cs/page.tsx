'use client';

import { useState, useCallback } from 'react';
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

const STATUS_LIST = [
  '교환요청',
  '진행 중',
  '미입고',
  '연락처없음',
  '안내완료',
  '완료',
] as const;

const STATUS_COLORS: Record<string, string> = {
  교환요청: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  미입고: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  연락처없음: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  '진행 중':
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  안내완료: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  완료: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
};

const EMPTY_FORM = {
  consultDate: new Date().toISOString().split('T')[0],
  purchaseDate: '',
  status: '안내완료',
  receivedDate: '',
  customerName: '',
  productName: '',
  consultNote: '',
  receivedProduct: '',
  serviceProgress: '',
  shippingDate: '',
  customerAddress: '확인필요',
  customerPhone: '',
  chargeType: '유상',
  repairCost: '',
  trackingNumber: '',
};

const COLUMNS = [
  { key: 'consultDate', label: '상담날짜', width: 100, align: 'left' },
  { key: 'purchaseDate', label: '구입일자', width: 100, align: 'left' },
  { key: 'status', label: '안내상태', width: 90, align: 'center' },
  { key: 'receivedDate', label: '입고날짜', width: 100, align: 'left' },
  { key: 'customerName', label: '고객명', width: 80, align: 'left' },
  { key: 'productName', label: '제품명', width: 140, align: 'left' },
  { key: 'consultNote', label: '상담내용', width: 180, align: 'left' },
  { key: 'receivedProduct', label: '입고제품', width: 140, align: 'left' },
  { key: 'serviceProgress', label: 'A/S 진행상황', width: 180, align: 'left' },
  { key: 'shippingDate', label: '출고날짜', width: 100, align: 'left' },
  { key: 'customerAddress', label: '고객주소', width: 200, align: 'left' },
  { key: 'customerPhone', label: '전화번호', width: 120, align: 'left' },
  { key: 'chargeType', label: '유상/무료', width: 80, align: 'center' },
  { key: 'repairCost', label: '수리비용', width: 90, align: 'right' },
  { key: 'trackingNumber', label: '배송번호', width: 120, align: 'left' },
] as const;

function toDateInput(value: string | null): string {
  if (!value) return '';
  return new Date(value).toISOString().split('T')[0];
}

export default function CSPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const isOwner = session?.user?.role === 'OWNER';

  // 컬럼 순서
  const [colOrder, setColOrder] = useState<number[]>(COLUMNS.map((_, i) => i));
  const [dragCol, setDragCol] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<number | null>(null);

  const onDragStart = (orderIdx: number, e: React.DragEvent) => {
    setDragCol(orderIdx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (orderIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCol(orderIdx);
  };

  const onDragEnd = () => {
    if (dragCol !== null && dragOverCol !== null && dragCol !== dragOverCol) {
      setColOrder((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragCol, 1);
        next.splice(dragOverCol, 0, moved);
        return next;
      });
      setColWidths((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragCol, 1);
        next.splice(dragOverCol, 0, moved);
        return next;
      });
    }
    setDragCol(null);
    setDragOverCol(null);
  };

  // 컬럼 리사이즈
  const [colWidths, setColWidths] = useState<number[]>(
    COLUMNS.map((c) => c.width),
  );
  const onResizeStart = useCallback(
    (colIdx: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startW = colWidths[colIdx];

      const onMouseMove = (ev: MouseEvent) => {
        const diff = ev.clientX - startX;
        const newWidth = Math.max(50, startW + diff);
        setColWidths((prev) => {
          const next = [...prev];
          next[colIdx] = newWidth;
          return next;
        });
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [colWidths],
  );

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
    mutationFn: async (payload: {
      id?: string;
      data: Record<string, unknown>;
    }) => {
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
    if (!form.consultDate || !form.customerName || !form.productName) {
      toast.error('상담날짜, 고객명, 제품명은 필수입니다');
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

  const renderCell = (r: CSRecord, key: string) => {
    const fmtDate = (v: string | null) =>
      v ? new Date(v).toLocaleDateString('ko-KR') : '-';

    switch (key) {
      case 'consultDate':
        return (
          <span className="font-mono text-xs">{fmtDate(r.consultDate)}</span>
        );
      case 'purchaseDate':
        return (
          <span className="font-mono text-xs">{fmtDate(r.purchaseDate)}</span>
        );
      case 'status':
        return (
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] || 'bg-muted text-muted-foreground'}`}
          >
            {r.status}
          </span>
        );
      case 'receivedDate':
        return (
          <span className="font-mono text-xs">{fmtDate(r.receivedDate)}</span>
        );
      case 'customerName':
        return <span className="font-medium">{r.customerName}</span>;
      case 'productName':
        return r.productName;
      case 'consultNote':
        return (
          <span className="text-muted-foreground">{r.consultNote || '-'}</span>
        );
      case 'receivedProduct':
        return r.receivedProduct || '-';
      case 'serviceProgress':
        return (
          <span className="text-muted-foreground">
            {r.serviceProgress || '-'}
          </span>
        );
      case 'shippingDate':
        return (
          <span className="font-mono text-xs">{fmtDate(r.shippingDate)}</span>
        );
      case 'customerAddress':
        return (
          <span className="text-muted-foreground">
            {r.customerAddress || '-'}
          </span>
        );
      case 'customerPhone':
        return <span className="font-mono text-xs">{r.customerPhone}</span>;
      case 'chargeType':
        return (
          <span
            className={`text-xs font-medium ${r.chargeType === '유상' ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`}
          >
            {r.chargeType}
          </span>
        );
      case 'repairCost':
        return (
          <span className="font-mono">
            {r.repairCost ? `${r.repairCost.toLocaleString()}원` : '-'}
          </span>
        );
      case 'trackingNumber':
        return (
          <span className="font-mono text-xs">{r.trackingNumber || '-'}</span>
        );
      default:
        return '-';
    }
  };

  const formatPhone = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
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
          <Plus className="h-4 w-4" />새 CS 등록
        </button>
      </div>

      {/* 테이블 */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table
            className="text-sm"
            style={{
              tableLayout: 'fixed',
              width: colWidths.reduce((a, b) => a + b, 0),
            }}
          >
            <thead>
              <tr className="border-b-2 border-border bg-muted">
                {colOrder.map((colIdx, orderIdx) => {
                  const col = COLUMNS[colIdx];
                  return (
                    <th
                      key={col.key}
                      draggable
                      onDragStart={(e) => onDragStart(orderIdx, e)}
                      onDragOver={(e) => onDragOver(orderIdx, e)}
                      onDragEnd={onDragEnd}
                      className={`relative cursor-grab whitespace-nowrap border-r border-border px-4 py-3 font-semibold text-foreground active:cursor-grabbing text-${col.align} last:border-r-0 ${dragOverCol === orderIdx && dragCol !== orderIdx ? 'bg-primary/10' : ''}`}
                      style={{ width: colWidths[orderIdx] }}
                    >
                      {col.label}
                      <div
                        onMouseDown={(e) => onResizeStart(orderIdx, e)}
                        className="absolute -right-[3px] top-2 z-10 h-[calc(100%-16px)] w-1 cursor-col-resize rounded-full bg-gray-300 hover:bg-blue-500 dark:bg-gray-600 dark:hover:bg-blue-400"
                      />
                    </th>
                  );
                })}
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
                    {colOrder.map((colIdx) => {
                      const col = COLUMNS[colIdx];
                      return (
                        <td
                          key={col.key}
                          className={`overflow-hidden truncate px-4 py-3 text-${col.align}`}
                        >
                          {renderCell(r, col.key)}
                        </td>
                      );
                    })}
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
          <div
            className={`max-h-[90vh] w-full overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl ${editingId ? 'max-w-2xl' : 'max-w-md'}`}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingId ? 'CS 상세 / 수정' : '새 CS 등록'}
              </h2>
              <button
                onClick={closeDialog}
                className="rounded p-1 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editingId ? (
              /* 수정 모드: 전체 필드 2컬럼 */
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    고객 정보
                  </h3>
                  <Field label="고객명 *">
                    <input
                      type="text"
                      value={form.customerName}
                      onChange={(e) =>
                        updateField('customerName', e.target.value)
                      }
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </Field>
                  <Field label="전화번호 *">
                    <input
                      type="text"
                      value={form.customerPhone}
                      onChange={(e) =>
                        updateField(
                          'customerPhone',
                          formatPhone(e.target.value),
                        )
                      }
                      placeholder="010-0000-0000"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </Field>
                  <Field label="고객 주소">
                    <input
                      type="text"
                      value={form.customerAddress}
                      onChange={(e) =>
                        updateField('customerAddress', e.target.value)
                      }
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </Field>
                  <Field label="상담날짜 *">
                    <input
                      type="date"
                      value={form.consultDate}
                      onChange={(e) =>
                        updateField('consultDate', e.target.value)
                      }
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </Field>
                  <Field label="제품구입일자">
                    <input
                      type="date"
                      value={form.purchaseDate}
                      onChange={(e) =>
                        updateField('purchaseDate', e.target.value)
                      }
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </Field>
                  <Field label="제품명 *">
                    <input
                      type="text"
                      value={form.productName}
                      onChange={(e) =>
                        updateField('productName', e.target.value)
                      }
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </Field>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    A/S 정보
                  </h3>
                  <Field label="안내상태">
                    <select
                      value={form.status}
                      onChange={(e) => updateField('status', e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {STATUS_LIST.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="A/S 내용 및 상담내용">
                    <textarea
                      value={form.consultNote}
                      onChange={(e) =>
                        updateField('consultNote', e.target.value)
                      }
                      rows={2}
                      className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </Field>
                  <Field label="입고된 제품">
                    <input
                      type="text"
                      value={form.receivedProduct}
                      onChange={(e) =>
                        updateField('receivedProduct', e.target.value)
                      }
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </Field>
                  <Field label="A/S 진행상황">
                    <textarea
                      value={form.serviceProgress}
                      onChange={(e) =>
                        updateField('serviceProgress', e.target.value)
                      }
                      rows={2}
                      className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </Field>
                  <Field label="제품입고날짜">
                    <input
                      type="date"
                      value={form.receivedDate}
                      onChange={(e) =>
                        updateField('receivedDate', e.target.value)
                      }
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </Field>
                  <Field label="출고날짜">
                    <input
                      type="date"
                      value={form.shippingDate}
                      onChange={(e) =>
                        updateField('shippingDate', e.target.value)
                      }
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="유상/무료">
                      <select
                        value={form.chargeType}
                        onChange={(e) =>
                          updateField('chargeType', e.target.value)
                        }
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="유상">유상</option>
                        <option value="무료">무료</option>
                      </select>
                    </Field>
                    <Field label="수리비용 (원)">
                      <input
                        type="number"
                        value={form.repairCost}
                        onChange={(e) =>
                          updateField('repairCost', e.target.value)
                        }
                        placeholder="0"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </Field>
                  </div>
                  <Field label="배송번호">
                    <input
                      type="text"
                      value={form.trackingNumber}
                      onChange={(e) =>
                        updateField('trackingNumber', e.target.value)
                      }
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </Field>
                </div>
              </div>
            ) : (
              /* 등록 모드: 간단한 폼 */
              <div className="space-y-4">
                <Field label="고객명 *">
                  <input
                    type="text"
                    value={form.customerName}
                    onChange={(e) =>
                      updateField('customerName', e.target.value)
                    }
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </Field>
                <Field label="전화번호 *">
                  <input
                    type="text"
                    value={form.customerPhone}
                    onChange={(e) =>
                      updateField('customerPhone', formatPhone(e.target.value))
                    }
                    placeholder="010-0000-0000"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </Field>
                <Field label="고객 주소">
                  <input
                    type="text"
                    value={form.customerAddress}
                    onChange={(e) =>
                      updateField('customerAddress', e.target.value)
                    }
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </Field>
                <Field label="상담날짜 *">
                  <input
                    type="date"
                    value={form.consultDate}
                    onChange={(e) => updateField('consultDate', e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </Field>
                <Field label="제품명 *">
                  <input
                    type="text"
                    value={form.productName}
                    onChange={(e) => updateField('productName', e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </Field>
                <Field label="A/S 내용 및 상담내용">
                  <textarea
                    value={form.consultNote}
                    onChange={(e) => updateField('consultNote', e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
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
