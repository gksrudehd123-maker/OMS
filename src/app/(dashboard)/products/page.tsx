'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Product = {
  id: string;
  name: string;
  optionInfo: string;
  costPrice: string | null;
  sellingPrice: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { orders: number };
};

type Channel = {
  id: string;
  name: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [channelId, setChannelId] = useState('');
  const limit = 20;

  useEffect(() => {
    fetch('/api/channels')
      .then((res) => res.json())
      .then(setChannels);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search }),
      ...(channelId && { channelId }),
    });

    fetch(`/api/products?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products);
        setTotal(data.total);
      });
  }, [page, search, channelId]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">상품 관리</h1>
        <p className="text-sm text-muted-foreground">
          엑셀 업로드 시 자동 등록된 상품 목록입니다
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              총 {total}개 상품
            </span>
            <select
              value={channelId}
              onChange={(e) => {
                setChannelId(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">전체 채널</option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            placeholder="상품명, 옵션 검색..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상품명</TableHead>
                <TableHead>옵션정보</TableHead>
                <TableHead className="text-right">판매가</TableHead>
                <TableHead className="text-right">원가</TableHead>
                <TableHead className="text-center">주문수</TableHead>
                <TableHead className="text-center">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground"
                  >
                    등록된 상품이 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="max-w-[250px] truncate font-medium">
                      {product.name}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {product.optionInfo || '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {product.sellingPrice
                        ? `₩${Number(product.sellingPrice).toLocaleString()}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {product.costPrice
                        ? `₩${Number(product.costPrice).toLocaleString()}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {product._count.orders}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          product.isActive
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {product.isActive ? '활성' : '비활성'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
            >
              이전
            </button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
