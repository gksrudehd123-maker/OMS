'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  X,
  Plus,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Package,
  Pencil,
  Trash2,
  ShoppingBag,
  HelpCircle,
  History,
} from 'lucide-react';
import type { CSProduct } from './cs-product-tab';

type CSRecord = {
  id: string;
  consultDate: string;
  customerName: string;
  status: string;
  consultNote: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  교환요청:
    'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  미입고: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  연락처없음: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  '진행 중':
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  안내완료: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  완료: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
};

export default function CSProductDetailDialog({
  product,
  onClose,
}: {
  product: CSProduct;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [expandedFaq, setExpandedFaq] = useState<Set<string>>(new Set());

  // 구성품 폼
  const [partFormOpen, setPartFormOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<string | null>(null);
  const [partForm, setPartForm] = useState({
    name: '',
    price: '',
    storeUrl: '',
  });

  // FAQ 폼
  const [faqFormOpen, setFaqFormOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<string | null>(null);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '' });

  // 최신 상품 데이터 (구성품/FAQ 추가 후 갱신)
  const { data: latestProduct } = useQuery<CSProduct>({
    queryKey: ['cs-products', product.id],
    queryFn: async () => {
      const res = await fetch(`/api/cs-products?brand=${product.brand}`);
      const json = await res.json();
      const found = (json.data || []).find(
        (p: CSProduct) => p.id === product.id,
      );
      return found || product;
    },
    initialData: product,
  });

  // CS 이력
  const { data: csHistory = [] } = useQuery<CSRecord[]>({
    queryKey: ['cs-history', product.name],
    queryFn: async () => {
      const res = await fetch(
        `/api/cs?search=${encodeURIComponent(product.name)}`,
      );
      const json = await res.json();
      return (json.data || []).slice(0, 5);
    },
  });

  const p = latestProduct;

  // 구성품 CRUD
  const addPartMutation = useMutation({
    mutationFn: async () => {
      const url = editingPart
        ? `/api/cs-products/${product.id}/parts/${editingPart}`
        : `/api/cs-products/${product.id}/parts`;
      const res = await fetch(url, {
        method: editingPart ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partForm),
      });
      if (!res.ok) throw new Error('저장 실패');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs-products'] });
      toast.success(
        editingPart ? '구성품이 수정되었습니다' : '구성품이 추가되었습니다',
      );
      setPartFormOpen(false);
      setEditingPart(null);
      setPartForm({ name: '', price: '', storeUrl: '' });
    },
    onError: () => toast.error('저장 중 오류가 발생했습니다'),
  });

  const deletePartMutation = useMutation({
    mutationFn: async (partId: string) => {
      const res = await fetch(
        `/api/cs-products/${product.id}/parts/${partId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error('삭제 실패');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs-products'] });
      toast.success('구성품이 삭제되었습니다');
    },
  });

  // FAQ CRUD
  const addFaqMutation = useMutation({
    mutationFn: async () => {
      const url = editingFaq
        ? `/api/cs-products/${product.id}/faq/${editingFaq}`
        : `/api/cs-products/${product.id}/faq`;
      const res = await fetch(url, {
        method: editingFaq ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(faqForm),
      });
      if (!res.ok) throw new Error('저장 실패');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs-products'] });
      toast.success(
        editingFaq ? 'FAQ가 수정되었습니다' : 'FAQ가 추가되었습니다',
      );
      setFaqFormOpen(false);
      setEditingFaq(null);
      setFaqForm({ question: '', answer: '' });
    },
    onError: () => toast.error('저장 중 오류가 발생했습니다'),
  });

  const deleteFaqMutation = useMutation({
    mutationFn: async (faqId: string) => {
      const res = await fetch(`/api/cs-products/${product.id}/faq/${faqId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('삭제 실패');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs-products'] });
      toast.success('FAQ가 삭제되었습니다');
    },
  });

  function toggleFaq(id: string) {
    setExpandedFaq((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openEditPart(part: {
    id: string;
    name: string;
    price: number | null;
    storeUrl: string | null;
  }) {
    setEditingPart(part.id);
    setPartForm({
      name: part.name,
      price: part.price ? String(part.price) : '',
      storeUrl: part.storeUrl || '',
    });
    setPartFormOpen(true);
  }

  function openEditFaq(faq: { id: string; question: string; answer: string }) {
    setEditingFaq(faq.id);
    setFaqForm({ question: faq.question, answer: faq.answer });
    setFaqFormOpen(true);
  }

  const formatPrice = (price: number) => '₩' + price.toLocaleString('ko-KR');

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-lg font-semibold">{p.name}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* 제품 정보 */}
          <div className="flex gap-5">
            <div className="h-32 w-32 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">
                브랜드:{' '}
                <span className="font-medium text-foreground">{p.brand}</span>
              </p>
              {p.price && (
                <p className="text-xl font-bold text-primary">
                  {formatPrice(p.price)}
                </p>
              )}
              {p.storeUrl && (
                <a
                  href={p.storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  스토어 링크
                </a>
              )}
            </div>
          </div>

          {/* 구성품 */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <ShoppingBag className="h-4 w-4" />
                구성품
              </h3>
              <button
                onClick={() => {
                  setEditingPart(null);
                  setPartForm({ name: '', price: '', storeUrl: '' });
                  setPartFormOpen(true);
                }}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5" />
                추가
              </button>
            </div>

            {p.parts.length === 0 && !partFormOpen ? (
              <p className="rounded-lg border border-dashed border-border py-4 text-center text-sm text-muted-foreground">
                등록된 구성품이 없습니다
              </p>
            ) : (
              <div className="space-y-1">
                {p.parts.map((part) => (
                  <div
                    key={part.id}
                    className="group flex items-center justify-between rounded-lg border border-border px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{part.name}</span>
                      {part.price && (
                        <span className="text-sm text-muted-foreground">
                          {formatPrice(part.price)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {part.storeUrl && (
                        <a
                          href={part.storeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md p-1 text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => openEditPart(part)}
                        className="rounded-md p-1 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deletePartMutation.mutate(part.id)}
                        className="rounded-md p-1 text-muted-foreground opacity-0 hover:text-red-600 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 구성품 추가/수정 폼 */}
            {partFormOpen && (
              <div className="mt-2 space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <input
                  type="text"
                  value={partForm.name}
                  onChange={(e) =>
                    setPartForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="구성품명 *"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={partForm.price}
                    onChange={(e) =>
                      setPartForm((prev) => ({
                        ...prev,
                        price: e.target.value,
                      }))
                    }
                    placeholder="가격"
                    className="w-1/3 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <input
                    type="text"
                    value={partForm.storeUrl}
                    onChange={(e) =>
                      setPartForm((prev) => ({
                        ...prev,
                        storeUrl: e.target.value,
                      }))
                    }
                    placeholder="구매 링크"
                    className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setPartFormOpen(false);
                      setEditingPart(null);
                    }}
                    className="rounded-md px-3 py-1 text-xs font-medium hover:bg-muted"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => addPartMutation.mutate()}
                    disabled={
                      !partForm.name.trim() || addPartMutation.isPending
                    }
                    className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {addPartMutation.isPending ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 제품 설명 */}
          {p.description && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">제품 설명</h3>
              <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-sm leading-relaxed">
                {p.description}
              </pre>
            </div>
          )}

          {/* FAQ */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <HelpCircle className="h-4 w-4" />
                자주 묻는 질문 (FAQ)
              </h3>
              <button
                onClick={() => {
                  setEditingFaq(null);
                  setFaqForm({ question: '', answer: '' });
                  setFaqFormOpen(true);
                }}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5" />
                질문 추가
              </button>
            </div>

            {p.faqs.length === 0 && !faqFormOpen ? (
              <p className="rounded-lg border border-dashed border-border py-4 text-center text-sm text-muted-foreground">
                등록된 FAQ가 없습니다
              </p>
            ) : (
              <div className="space-y-1">
                {p.faqs.map((faq) => (
                  <div key={faq.id} className="rounded-lg border border-border">
                    <button
                      onClick={() => toggleFaq(faq.id)}
                      className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium hover:bg-muted/50"
                    >
                      <span className="flex items-center gap-2">
                        {expandedFaq.has(faq.id) ? (
                          <ChevronDown className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        {faq.question}
                      </span>
                      <span className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditFaq(faq);
                          }}
                          className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFaqMutation.mutate(faq.id);
                          }}
                          className="rounded-md p-1 text-muted-foreground hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </button>
                    {expandedFaq.has(faq.id) && (
                      <div className="border-t border-border bg-muted/20 px-3 py-2.5">
                        <pre className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                          {faq.answer}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* FAQ 추가/수정 폼 */}
            {faqFormOpen && (
              <div className="mt-2 space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <input
                  type="text"
                  value={faqForm.question}
                  onChange={(e) =>
                    setFaqForm((prev) => ({
                      ...prev,
                      question: e.target.value,
                    }))
                  }
                  placeholder="질문 *"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <textarea
                  value={faqForm.answer}
                  onChange={(e) =>
                    setFaqForm((prev) => ({
                      ...prev,
                      answer: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="답변 *"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setFaqFormOpen(false);
                      setEditingFaq(null);
                    }}
                    className="rounded-md px-3 py-1 text-xs font-medium hover:bg-muted"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => addFaqMutation.mutate()}
                    disabled={
                      !faqForm.question.trim() ||
                      !faqForm.answer.trim() ||
                      addFaqMutation.isPending
                    }
                    className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {addFaqMutation.isPending ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* CS 이력 */}
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <History className="h-4 w-4" />이 상품 CS 이력 (최근 5건)
            </h3>
            {csHistory.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-4 text-center text-sm text-muted-foreground">
                관련 CS 이력이 없습니다
              </p>
            ) : (
              <div className="space-y-1">
                {csHistory.map((cs) => (
                  <div
                    key={cs.id}
                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {formatDate(cs.consultDate)}
                    </span>
                    <span className="font-medium">{cs.customerName}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[cs.status] || ''}`}
                    >
                      {cs.status}
                    </span>
                    {cs.consultNote && (
                      <span className="truncate text-muted-foreground">
                        &quot;{cs.consultNote}&quot;
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
