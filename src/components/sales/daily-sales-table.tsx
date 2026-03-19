'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

type DailySalesItem = {
  id: string;
  date: string;
  optionId: string;
  optionName: string;
  salesAmount: string;
  salesQuantity: number;
  totalAmount: string | null;
  totalQuantity: number | null;
  cancelAmount: string | null;
  cancelQuantity: number | null;
  categoryName: string | null;
  margin: {
    salesAmount: number;
    margin: number;
    marginRate: number;
    isCalculable: boolean;
  };
};

export function DailySalesTable({
  channelId,
  refreshKey,
}: {
  channelId: string;
  refreshKey: number;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 20;

  const { data, isLoading: loading } = useQuery<{
    sales: DailySalesItem[];
    total: number;
  }>({
    queryKey: ['daily-sales', channelId, page, search, refreshKey],
    queryFn: async () => {
      const params = new URLSearchParams({
        channelId,
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
      });
      const res = await fetch(`/api/daily-sales?${params}`);
      return res.json();
    },
    enabled: !!channelId,
  });

  const sales = data?.sales ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">판매 내역 (로켓그로스)</h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="옵션명 검색..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-sm text-muted-foreground">총 {total}건</span>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead>옵션명</TableHead>
              <TableHead>카테고리</TableHead>
              <TableHead className="text-center">판매수량</TableHead>
              <TableHead className="text-right">순 판매금액</TableHead>
              <TableHead className="text-center">취소수량</TableHead>
              <TableHead className="text-right">마진</TableHead>
              <TableHead className="text-center">마진율</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : sales.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-32 text-center text-muted-foreground"
                >
                  판매 데이터가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              sales.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {new Date(item.date).toLocaleDateString('ko-KR')}
                  </TableCell>
                  <TableCell className="max-w-[250px] truncate">
                    {item.optionName}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.categoryName || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.salesQuantity}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    ₩{Number(item.salesAmount).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {item.cancelQuantity ?? 0}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {item.margin.isCalculable ? (
                      <span
                        className={
                          item.margin.margin >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }
                      >
                        ₩{item.margin.margin.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-orange-500 text-xs">미설정</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {item.margin.isCalculable ? (
                      <span
                        className={
                          item.margin.marginRate >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }
                      >
                        {item.margin.marginRate.toFixed(1)}%
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
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
  );
}
